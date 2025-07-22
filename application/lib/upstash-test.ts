/**
 * Test de validation des dépendances Upstash Redis
 * Ce fichier vérifie que les packages sont correctement installés
 * et prépare la configuration pour les tests de connexion
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Configuration de test (sera remplacée par les vraies credentials)
const testConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder-token'
};

/**
 * Fonction de test des dépendances
 * Vérifie que les packages sont importés correctement
 */
export function validateDependencies(): boolean {
  try {
    // Vérification que Redis peut être instantié
    const redis = new Redis(testConfig);
    
    // Vérification que Ratelimit peut être instantié
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10s'),
    });

    console.log('✅ Dépendances Upstash installées correctement');
    console.log('📦 @upstash/redis:', typeof Redis);
    console.log('📦 @upstash/ratelimit:', typeof Ratelimit);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la validation des dépendances:', error);
    return false;
  }
}

/**
 * Test de connexion Redis (nécessite des credentials valides)
 */
export async function testRedisConnection(): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('⚠️ Variables d\'environnement Redis manquantes - test de connexion ignoré');
    return false;
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // Test ping/pong
    const result = await redis.ping();
    console.log('🔗 Test de connexion Redis:', result);
    
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Erreur de connexion Redis:', error);
    return false;
  }
}

// Auto-exécution du test de validation si le fichier est exécuté directement
if (require.main === module) {
  console.log('🚀 Validation des dépendances Upstash Redis...');
  validateDependencies();
}
