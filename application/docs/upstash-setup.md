# Configuration Upstash Redis

Ce guide vous aide à configurer Upstash Redis pour le système de rate limiting de l'application Mazeway.

## 🚀 Étapes de configuration

### 1. Créer un compte Upstash
1. Rendez-vous sur [console.upstash.com](https://console.upstash.com)
2. Créez un compte ou connectez-vous
3. Cliquez sur "Create Database"

### 2. Configuration de la base Redis
1. **Nom**: `mazeway-rate-limiting` (ou nom de votre choix)
2. **Région**: Choisissez la région la plus proche de vos utilisateurs
3. **Type**: Global (recommandé pour la réplication)

### 3. Récupération des credentials
Une fois la base créée, récupérez :
- **UPSTASH_REDIS_REST_URL**: URL de l'API REST
- **UPSTASH_REDIS_REST_TOKEN**: Token d'authentification

### 4. Configuration des variables d'environnement
Ajoutez les credentials dans `.env.local` :

```bash
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

## 🧪 Test de la configuration

Exécutez le test de validation :

```bash
npx tsx lib/upstash-test.ts
```

Pour tester la connexion Redis (une fois les credentials configurés) :

```typescript
import { testRedisConnection } from './lib/upstash-test';
await testRedisConnection();
```

## 📊 Spécifications Rate Limiting

Le système utilisera ces configurations :

- **Auth operations**: 10 requêtes / 10 secondes
- **SMS operations**: Limites IP + utilisateur
- **General protection**: 1000 requêtes / minute
- **Data exports**: 3 requêtes / jour

## 🔧 Dépendances installées

- `@upstash/redis` v1.35.1 : Client Redis serverless
- `@upstash/ratelimit` v2.0.5 : Bibliothèque de rate limiting

## ⚡ Prochaines étapes

1. ✅ Dépendances installées
2. ✅ Configuration des variables d'environnement
3. 🔄 Configuration Upstash (manuel requis)
4. ⏳ Implémentation du service de rate limiting
5. ⏳ Création du middleware Next.js

---

**Note**: Une fois la configuration Upstash terminée, le système de rate limiting sera opérationnel.
