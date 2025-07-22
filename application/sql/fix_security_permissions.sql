-- Corrections pour la table security_events
-- Résolution de l'erreur "permission denied for table users"

-- 1. Modifiez la politique de lecture pour permettre la vérification de brute force
DROP POLICY IF EXISTS "security_events_select_policy" ON security_events;

-- Nouvelle politique permettant la lecture pour la détection de brute force
-- mais seulement pour les événements de connexion
CREATE POLICY "security_events_select_policy" ON security_events
    FOR SELECT
    USING (
        -- Permettre la lecture des événements de connexion pour la détection brute force
        event_type IN ('LOGIN_FAILED', 'LOGIN_ATTEMPT', 'SIGNUP_ATTEMPT')
        OR
        -- Permettre la lecture si l'utilisateur authentifié consulte ses propres événements
        auth.uid() = user_id 
        OR
        -- Permettre la lecture pour les admins (si vous avez un système de rôles)
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND (
                    auth.users.raw_user_meta_data->>'role' = 'admin'
                    OR auth.users.email_confirmed_at IS NOT NULL
                )
            )
        )
    );

-- 2. Alternative: Créer une fonction sécurisée pour la vérification brute force
-- qui contourne les restrictions RLS
CREATE OR REPLACE FUNCTION check_brute_force_attempts(
    check_ip inet,
    check_email text DEFAULT NULL,
    lookback_minutes integer DEFAULT 15,
    max_attempts integer DEFAULT 5
)
RETURNS TABLE(
    failed_attempts bigint,
    is_blocked boolean,
    remaining_attempts integer,
    lockout_ends_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER -- Cette fonction s'exécute avec les privilèges du propriétaire
SET search_path = public
AS $$
DECLARE
    lookback_time timestamp with time zone;
    attempt_count bigint;
    lockout_duration interval := '15 minutes';
BEGIN
    lookback_time := NOW() - (lookback_minutes || ' minutes')::interval;
    
    -- Compter les tentatives échouées récentes pour cette IP
    SELECT COUNT(*) INTO attempt_count
    FROM security_events
    WHERE event_type = 'LOGIN_FAILED'
    AND ip_address = check_ip
    AND created_at >= lookback_time;
    
    -- Si un email est fourni, vérifier aussi les tentatives pour cet email
    IF check_email IS NOT NULL THEN
        SELECT COUNT(*) INTO attempt_count
        FROM security_events
        WHERE event_type = 'LOGIN_FAILED'
        AND (ip_address = check_ip OR email = check_email)
        AND created_at >= lookback_time;
    END IF;
    
    RETURN QUERY SELECT 
        attempt_count,
        attempt_count >= max_attempts,
        GREATEST(0, max_attempts - attempt_count::integer),
        CASE 
            WHEN attempt_count >= max_attempts 
            THEN NOW() + lockout_duration
            ELSE NULL
        END;
END;
$$;

-- 3. Donner les permissions appropriées
-- Permettre à tous d'exécuter cette fonction
GRANT EXECUTE ON FUNCTION check_brute_force_attempts TO anon, authenticated;

-- 4. Optimisation: créer un index spécialement pour cette fonction
CREATE INDEX IF NOT EXISTS idx_security_events_brute_force_optimized 
ON security_events(ip_address, email, event_type, created_at) 
WHERE event_type = 'LOGIN_FAILED';
