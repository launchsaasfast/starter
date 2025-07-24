-- Politique RLS complète pour les tables 2FA
-- Application des permissions de sécurité pour user_mfa_factors et backup_codes

-- S'assurer que RLS est activé sur toutes les tables
ALTER TABLE IF EXISTS user_mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_events ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour recréer proprement
DROP POLICY IF EXISTS "user_mfa_factors_select_policy" ON user_mfa_factors;
DROP POLICY IF EXISTS "user_mfa_factors_insert_policy" ON user_mfa_factors;
DROP POLICY IF EXISTS "user_mfa_factors_update_policy" ON user_mfa_factors;
DROP POLICY IF EXISTS "user_mfa_factors_delete_policy" ON user_mfa_factors;

DROP POLICY IF EXISTS "backup_codes_select_policy" ON backup_codes;
DROP POLICY IF EXISTS "backup_codes_insert_policy" ON backup_codes;
DROP POLICY IF EXISTS "backup_codes_update_policy" ON backup_codes;
DROP POLICY IF EXISTS "backup_codes_delete_policy" ON backup_codes;

DROP POLICY IF EXISTS "device_sessions_select_policy" ON device_sessions;
DROP POLICY IF EXISTS "device_sessions_insert_policy" ON device_sessions;
DROP POLICY IF EXISTS "device_sessions_update_policy" ON device_sessions;
DROP POLICY IF EXISTS "device_sessions_delete_policy" ON device_sessions;

DROP POLICY IF EXISTS "security_events_insert_policy" ON security_events;

-- ==============================================
-- POLITIQUES POUR USER_MFA_FACTORS
-- ==============================================

-- Lecture : Les utilisateurs peuvent voir leurs propres facteurs MFA
CREATE POLICY "user_mfa_factors_select_policy" ON user_mfa_factors
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insertion : Les utilisateurs peuvent créer leurs propres facteurs MFA
CREATE POLICY "user_mfa_factors_insert_policy" ON user_mfa_factors
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Mise à jour : Les utilisateurs peuvent modifier leurs propres facteurs MFA
CREATE POLICY "user_mfa_factors_update_policy" ON user_mfa_factors
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Suppression : Les utilisateurs peuvent supprimer leurs propres facteurs MFA
CREATE POLICY "user_mfa_factors_delete_policy" ON user_mfa_factors
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================
-- POLITIQUES POUR BACKUP_CODES
-- ==============================================

-- Lecture : Les utilisateurs peuvent voir leurs propres codes de récupération
CREATE POLICY "backup_codes_select_policy" ON backup_codes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insertion : Les utilisateurs peuvent créer leurs propres codes de récupération
CREATE POLICY "backup_codes_insert_policy" ON backup_codes
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Mise à jour : Les utilisateurs peuvent modifier leurs propres codes de récupération
-- (principalement pour marquer un code comme utilisé)
CREATE POLICY "backup_codes_update_policy" ON backup_codes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Suppression : Les utilisateurs peuvent supprimer leurs propres codes de récupération
CREATE POLICY "backup_codes_delete_policy" ON backup_codes
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================
-- POLITIQUES POUR DEVICE_SESSIONS
-- ==============================================

-- Lecture : Les utilisateurs peuvent voir leurs propres sessions d'appareils
CREATE POLICY "device_sessions_select_policy" ON device_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insertion : Les utilisateurs peuvent créer leurs propres sessions d'appareils
CREATE POLICY "device_sessions_insert_policy" ON device_sessions
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Mise à jour : Les utilisateurs peuvent modifier leurs propres sessions d'appareils
CREATE POLICY "device_sessions_update_policy" ON device_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND auth.uid() IS NOT NULL
    );

-- Suppression : Les utilisateurs peuvent supprimer leurs propres sessions d'appareils
CREATE POLICY "device_sessions_delete_policy" ON device_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================
-- POLITIQUES POUR SECURITY_EVENTS (améliorées)
-- ==============================================

-- Mise à jour de la politique de lecture pour security_events
DROP POLICY IF EXISTS "security_events_select_policy" ON security_events;

CREATE POLICY "security_events_select_policy" ON security_events
    FOR SELECT
    USING (
        -- Permettre la lecture des événements de connexion pour la détection brute force
        event_type IN ('LOGIN_FAILED', 'LOGIN_ATTEMPT', 'SIGNUP_ATTEMPT', 'RATE_LIMIT_EXCEEDED')
        OR
        -- Permettre la lecture si l'utilisateur authentifié consulte ses propres événements
        auth.uid() = user_id 
        OR
        -- Permettre la lecture pour les utilisateurs confirmés (pour les fonctions de sécurité)
        (
            auth.uid() IS NOT NULL 
            AND EXISTS (
                SELECT 1 FROM auth.users 
                WHERE auth.users.id = auth.uid() 
                AND auth.users.email_confirmed_at IS NOT NULL
            )
        )
    );

-- Insertion : Permet l'insertion d'événements de sécurité
CREATE POLICY "security_events_insert_policy" ON security_events
    FOR INSERT
    WITH CHECK (true); -- Permet l'insertion depuis les fonctions de sécurité

-- ==============================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- ==============================================

-- Index pour user_mfa_factors
CREATE INDEX IF NOT EXISTS idx_user_mfa_factors_user_id 
    ON user_mfa_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_factors_factor_type 
    ON user_mfa_factors(factor_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_mfa_factors_lookup 
    ON user_mfa_factors(user_id, factor_type, is_active);

-- Index pour backup_codes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id 
    ON backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_lookup 
    ON backup_codes(user_id, code_hash) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_backup_codes_unused 
    ON backup_codes(user_id) WHERE used_at IS NULL;

-- Index pour device_sessions (correction du nom de colonne)
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id 
    ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_active 
    ON device_sessions(user_id, trusted) WHERE trusted = true;
CREATE INDEX IF NOT EXISTS idx_device_sessions_fingerprint 
    ON device_sessions(device_fingerprint);

-- Index pour security_events (améliorés)
CREATE INDEX IF NOT EXISTS idx_security_events_brute_force 
    ON security_events(ip_address, email, event_type, created_at) 
    WHERE event_type = 'LOGIN_FAILED';
CREATE INDEX IF NOT EXISTS idx_security_events_user_lookup 
    ON security_events(user_id, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_ip_lookup 
    ON security_events(ip_address, created_at);

-- ==============================================
-- FONCTIONS DE SÉCURITÉ AVANCÉES
-- ==============================================

-- Supprimer la fonction existante pour éviter les conflits
DROP FUNCTION IF EXISTS check_brute_force_attempts(text, text, integer, integer);

-- Fonction pour vérifier le brute force (sécurisée)
CREATE OR REPLACE FUNCTION check_brute_force_attempts(
    check_ip text,
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
    AND ip_address::text = check_ip
    AND created_at >= lookback_time;
    
    -- Si un email est fourni, vérifier aussi les tentatives pour cet email
    IF check_email IS NOT NULL THEN
        SELECT COUNT(*) INTO attempt_count
        FROM security_events
        WHERE event_type = 'LOGIN_FAILED'
        AND (ip_address::text = check_ip OR email = check_email)
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

-- Fonction pour nettoyer les anciennes sessions inactives
CREATE OR REPLACE FUNCTION cleanup_inactive_device_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer les sessions non-fiables de plus de 30 jours
    DELETE FROM device_sessions 
    WHERE trusted = false 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    -- Marquer comme non-fiables les sessions qui n'ont pas été mises à jour depuis 7 jours
    UPDATE device_sessions 
    SET trusted = false, updated_at = NOW()
    WHERE trusted = true 
    AND last_seen_at < NOW() - INTERVAL '7 days';
END;
$$;

-- ==============================================
-- PERMISSIONS ET GRANTS
-- ==============================================

-- Donner les permissions appropriées
GRANT ALL ON user_mfa_factors TO authenticated;
GRANT ALL ON backup_codes TO authenticated;
GRANT ALL ON device_sessions TO authenticated;
GRANT ALL ON security_events TO authenticated;

-- Permissions pour les fonctions
GRANT EXECUTE ON FUNCTION check_brute_force_attempts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_device_sessions TO authenticated;

-- ==============================================
-- TRIGGERS POUR AUTOMATISATION
-- ==============================================

-- Trigger pour mettre à jour automatically updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables appropriées
DROP TRIGGER IF EXISTS update_user_mfa_factors_updated_at ON user_mfa_factors;
CREATE TRIGGER update_user_mfa_factors_updated_at
    BEFORE UPDATE ON user_mfa_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_sessions_updated_at ON device_sessions;
CREATE TRIGGER update_device_sessions_updated_at
    BEFORE UPDATE ON device_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMMENTAIRES POUR DOCUMENTATION
-- ==============================================

COMMENT ON POLICY "user_mfa_factors_select_policy" ON user_mfa_factors IS 
'Permet aux utilisateurs de voir uniquement leurs propres facteurs MFA';

COMMENT ON POLICY "backup_codes_insert_policy" ON backup_codes IS 
'Permet aux utilisateurs authentifiés de créer leurs propres codes de récupération';

COMMENT ON FUNCTION check_brute_force_attempts IS 
'Fonction sécurisée pour vérifier les tentatives de connexion en force brute';

COMMENT ON FUNCTION cleanup_inactive_device_sessions IS 
'Nettoie automatiquement les sessions d''appareils inactives';

-- Fin des politiques RLS pour 2FA
