-- Table pour stocker les événements de sécurité
-- Cette table doit être créée dans Supabase pour le logging des événements

CREATE TABLE IF NOT EXISTS security_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    ip_address INET NOT NULL,
    user_agent TEXT,
    user_id uuid REFERENCES auth.users(id),
    email text,
    details jsonb DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index pour les requêtes de performance
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Index composite pour la détection de brute force
CREATE INDEX IF NOT EXISTS idx_security_events_brute_force 
ON security_events(event_type, ip_address, created_at) 
WHERE event_type IN ('LOGIN_FAILED', 'LOGIN_ATTEMPT');

-- RLS (Row Level Security) policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Politique pour l'insertion (permettre à tous les utilisateurs authentifiés ou non)
-- Car le logging de sécurité doit fonctionner même pour les requêtes non authentifiées
CREATE POLICY "security_events_insert_policy" ON security_events
    FOR INSERT
    WITH CHECK (true);

-- Politique pour la lecture (seulement les administrateurs)
-- À ajuster selon votre système de rôles
CREATE POLICY "security_events_select_policy" ON security_events
    FOR SELECT
    USING (
        -- Permettre la lecture seulement si l'utilisateur a un rôle admin
        -- ou si c'est ses propres événements
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Fonction pour nettoyer les anciens événements (optionnel)
-- À exécuter périodiquement pour éviter l'accumulation de données
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND severity IN ('INFO', 'WARNING');
    
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND severity = 'ERROR';
    
    -- Garder les événements CRITICAL plus longtemps
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '2 years'
    AND severity = 'CRITICAL';
END;
$$;

-- Créer une vue pour les statistiques de sécurité
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    event_type,
    severity,
    COUNT(*) as count,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT user_id) as unique_users
FROM security_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type, severity
ORDER BY hour DESC;

-- Accorder les permissions nécessaires
-- Note: Ajustez selon votre configuration Supabase
GRANT SELECT ON security_events_summary TO authenticated;
GRANT INSERT ON security_events TO anon, authenticated;

-- Commentaires pour la documentation
COMMENT ON TABLE security_events IS 'Table pour stocker tous les événements de sécurité de l''application';
COMMENT ON COLUMN security_events.event_type IS 'Type d''événement: LOGIN_ATTEMPT, SIGNUP_ATTEMPT, RATE_LIMIT_EXCEEDED, etc.';
COMMENT ON COLUMN security_events.severity IS 'Niveau de sévérité: INFO, WARNING, ERROR, CRITICAL';
COMMENT ON COLUMN security_events.details IS 'Données JSON additionnelles selon le type d''événement';
COMMENT ON COLUMN security_events.ip_address IS 'Adresse IP du client (peut provenir de proxies/CDN)';

-- Exemple de requêtes utiles pour le monitoring:

-- Détecter les tentatives de brute force
/*
SELECT 
    ip_address,
    COUNT(*) as failed_attempts,
    MAX(created_at) as last_attempt,
    array_agg(DISTINCT details->>'email') as targeted_emails
FROM security_events 
WHERE event_type = 'LOGIN_FAILED' 
    AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;
*/

-- Statistiques par type d'événement
/*
SELECT 
    event_type,
    severity,
    COUNT(*) as count,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY count DESC;
*/

-- Top des IPs suspectes
/*
SELECT 
    ip_address,
    COUNT(*) as total_events,
    COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_events,
    COUNT(CASE WHEN event_type LIKE '%_FAILED' THEN 1 END) as failed_events,
    MAX(created_at) as last_activity
FROM security_events 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) > 10 OR COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) > 0
ORDER BY critical_events DESC, total_events DESC;
*/
