# Documentation du Système de Rate Limiting

## Vue d'ensemble

Ce système de rate limiting protège l'application contre les abus et les attaques par déni de service (DoS) en limitant le nombre de requêtes qu'un client peut effectuer dans une période donnée. Il utilise Upstash Redis avec un algorithme de fenêtre glissante pour une précision et des performances optimales.

## Architecture

### Composants principaux

1. **Service de Rate Limiting** (`lib/rate-limit.ts`)
   - Gestion centralisée des limitations
   - Implémentation des tiers de protection
   - Interface avec Redis Upstash

2. **Middleware Next.js** (`middleware.ts`)
   - Interception des requêtes API
   - Application des règles de rate limiting
   - Gestion des réponses d'erreur

3. **Logger de Sécurité** (`lib/security-logger.ts`)
   - Logging des événements de sécurité
   - Intégration avec Supabase
   - Alertes et monitoring

4. **Scripts de Monitoring** (`scripts/monitor-rate-limits.ts`)
   - Dashboard en temps réel
   - Génération d'alertes
   - Rapports de sécurité

## Tiers de Rate Limiting

Selon le document `security-algorithms.md`, le système implémente 5 tiers de protection :

### 1. AUTH_OPERATIONS
- **Limite**: 10 requêtes par 10 secondes
- **Scope**: Par adresse IP
- **Usage**: Routes d'authentification (`/api/auth/*`)
- **Protection**: Attaques par force brute sur les logins

```typescript
// Exemple d'usage
const result = await getRateLimitService().checkLimit(
  RateLimitTier.AUTH_OPERATIONS, 
  clientIP
);
```

### 2. SMS_OPERATIONS
- **Limite IP**: 10 requêtes par heure
- **Limite Utilisateur**: 5 requêtes par heure
- **Scope**: Double vérification (IP + User ID)
- **Usage**: Envoi de SMS (`/api/sms/*`)
- **Protection**: Spam SMS et abus de coûts

```typescript
// Vérification combinée IP + utilisateur
const smsLimits = await getRateLimitService().checkSMSLimits(clientIP, userID);
if (!smsLimits.ipLimit.success || !smsLimits.userLimit?.success) {
  // Bloquer la requête
}
```

### 3. GENERAL_PROTECTION
- **Limite**: 1000 requêtes par minute
- **Scope**: Par adresse IP
- **Usage**: Toutes les routes API non spécifiquement configurées
- **Protection**: Flooding général de l'API

### 4. AUTHENTICATED_OPERATIONS
- **Limite**: 100 requêtes par minute
- **Scope**: Par utilisateur authentifié
- **Usage**: Opérations utilisateur (`/api/user/*`, `/api/dashboard`)
- **Protection**: Abus des fonctionnalités utilisateur

### 5. DATA_EXPORTS
- **Limite**: 3 requêtes par jour
- **Scope**: Par utilisateur
- **Usage**: Exports de données (`/api/data/export`, `/api/admin/export`)
- **Protection**: Abus des exports coûteux

## Configuration

### Variables d'environnement

```bash
# Configuration Redis Upstash (requis)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Configuration Supabase pour le logging (optionnel)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Configuration des routes

Le middleware applique automatiquement les tiers selon la configuration dans `middleware.ts` :

```typescript
const PROTECTED_ROUTES = {
  '/api/auth/signin': RateLimitTier.AUTH_OPERATIONS,
  '/api/auth/signup': RateLimitTier.AUTH_OPERATIONS,
  '/api/sms/send': RateLimitTier.SMS_OPERATIONS,
  '/api/data/export': RateLimitTier.DATA_EXPORTS,
  // ...
};
```

## Utilisation

### Intégration automatique

Le middleware Next.js s'active automatiquement pour toutes les routes API configurées. Aucune modification des routes individuelles n'est nécessaire.

### Vérification manuelle

Pour des cas spéciaux, vous pouvez vérifier les limites manuellement :

```typescript
import { getRateLimitService, RateLimitTier } from '@/lib/rate-limit';

// Dans une route API
const rateLimitService = getRateLimitService();
const result = await rateLimitService.checkLimit(
  RateLimitTier.AUTH_OPERATIONS,
  clientIP
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString()
    }
  });
}
```

### Headers de réponse

Le système ajoute automatiquement des headers informatifs :

- `X-RateLimit-Limit`: Limite maximale
- `X-RateLimit-Remaining`: Requêtes restantes
- `X-RateLimit-Reset`: Timestamp de réinitialisation
- `X-RateLimit-Policy`: Politique appliquée

## Monitoring et Alertes

### Dashboard en temps réel

Lancez le monitoring interactif :

```bash
npx tsx scripts/monitor-rate-limits.ts
```

Fonctionnalités :
- Statistiques en temps réel
- Top des IPs bloquées
- Santé du système Redis
- Alertes automatiques

### Génération de rapports

```bash
npx tsx scripts/monitor-rate-limits.ts --report
```

### Intégration avec les logs de sécurité

Le système enregistre automatiquement tous les événements de rate limiting dans Supabase :

```sql
-- Requête pour voir les violations récentes
SELECT * FROM security_events 
WHERE event_type = 'RATE_LIMIT_EXCEEDED' 
ORDER BY created_at DESC 
LIMIT 50;
```

## Tests

### Tests unitaires

```bash
# Tests du service de rate limiting
npx tsx tests/rate-limit.test.ts

# Tests du middleware
npx tsx tests/middleware.test.ts
```

### Tests de charge

```bash
# Test complet de résistance aux attaques
npx tsx tests/load/rate-limit-stress.ts

# Test rapide de validation
npx tsx tests/load/rate-limit-stress.ts --quick
```

### Tests d'intégration

```bash
# Validation complète du système
npx tsx tests/auth-security.test.ts
```

## Troubleshooting

### Problèmes courants

#### 1. Redis inaccessible

**Symptômes**: Erreurs de connexion, middleware qui ne bloque pas

**Solutions**:
```bash
# Vérifier les variables d'environnement
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Tester la connexion
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
     "$UPSTASH_REDIS_REST_URL/ping"
```

Le système utilise un mode "fail-open" : si Redis est indisponible, les requêtes sont autorisées pour éviter de bloquer complètement l'application.

#### 2. Taux de blocage trop élevé

**Symptômes**: Utilisateurs légitimes bloqués

**Solutions**:
1. Ajuster les limites dans `lib/rate-limit.ts`
2. Vérifier les patterns de trafic dans le monitoring
3. Analyser les logs de sécurité

```typescript
// Exemple d'ajustement
[RateLimitTier.AUTH_OPERATIONS]: {
  requests: 15, // Augmenté de 10 à 15
  window: '10s',
  windowMs: 10 * 1000
}
```

#### 3. Performance dégradée

**Symptômes**: Latence élevée sur les requêtes API

**Diagnostics**:
```bash
# Vérifier la latence Redis
npx tsx scripts/monitor-rate-limits.ts
```

**Solutions**:
- Vérifier la localisation du serveur Redis
- Optimiser les requêtes Redis groupées
- Considérer un cache local pour les limites

#### 4. Logs de sécurité manquants

**Symptômes**: Événements non enregistrés dans Supabase

**Solutions**:
1. Vérifier la connexion Supabase
2. Vérifier les permissions RLS
3. Créer la table security_events

```sql
-- Créer la table si elle n'existe pas
\i sql/security_events_table.sql
```

### Mode Debug

Activez les logs détaillés :

```typescript
// Dans lib/rate-limit.ts
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('[Rate Limit]', { tier, key, result });
}
```

### Métriques de performance

Surveillez ces métriques clés :

1. **Latence Redis** : < 50ms (optimal), < 100ms (acceptable)
2. **Taux d'erreur** : < 1%
3. **Taux de blocage** : Variable selon les tiers (5-20% normal)
4. **Mémoire Redis** : Surveillez la croissance

## Sécurité

### Bonnes pratiques

1. **Rotation des tokens** : Changez régulièrement les tokens Upstash
2. **Monitoring actif** : Surveillez les tentatives d'attaque
3. **Alertes** : Configurez des notifications pour les seuils critiques
4. **Logs** : Conservez les logs de sécurité pour audit

### Protection contre la contournement

1. **Headers multiples** : Le système vérifie plusieurs headers pour l'IP
2. **Normalisation** : Les IPs sont normalisées pour éviter les doublons
3. **Fenêtre glissante** : Plus précis que les fenêtres fixes
4. **Logging** : Toutes les tentatives sont enregistrées

### Conformité RGPD

- Les IPs sont hashées dans les logs de sécurité
- Rétention limitée (90 jours pour les événements INFO/WARNING)
- Droit à l'oubli respecté dans les politiques RLS

## Évolution et maintenance

### Ajout d'un nouveau tier

1. Définir le tier dans `RateLimitTier` enum
2. Ajouter la configuration dans `RATE_LIMIT_CONFIGS`
3. Mettre à jour le middleware si nécessaire
4. Ajouter les tests correspondants

```typescript
// 1. Nouveau tier
export enum RateLimitTier {
  // ... existants
  PREMIUM_OPERATIONS = 'PREMIUM_OPERATIONS'
}

// 2. Configuration
[RateLimitTier.PREMIUM_OPERATIONS]: {
  requests: 500,
  window: '1m',
  windowMs: 60 * 1000
}

// 3. Route dans middleware
'/api/premium/*': RateLimitTier.PREMIUM_OPERATIONS
```

### Optimisations futures

1. **Cache local** : Réduire les appels Redis fréquents
2. **Geo-blocking** : Bloquer par pays/région
3. **ML Detection** : Détection intelligente des bots
4. **API Keys** : Tiers spéciaux pour les API keys

## Support

### Logs utiles

```bash
# Logs du middleware Next.js
tail -f .next/server.log | grep "Rate Limit"

# Logs Redis via monitoring
npx tsx scripts/monitor-rate-limits.ts --report

# Logs Supabase
SELECT * FROM security_events 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Contact et ressources

- Documentation Upstash : https://docs.upstash.com/
- Monitoring : Dashboard intégré
- Tests : Suite complète dans `/tests/`
- Exemples : Voir les fichiers de test

---

*Cette documentation est maintenue automatiquement avec le code. Dernière mise à jour : système de tests et monitoring complet.*
