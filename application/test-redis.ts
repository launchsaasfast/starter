import { Redis } from '@upstash/redis';

// Lecture directe du fichier .env.local pour les tests
const url = 'https://pleasant-reptile-29846.upstash.io';
const token = 'AXSWAAIjcDE5MWE1NjE1NmZkNjU0M2RhYTIyNzdhOTI5YWYxMDU2MnAxMA';

const redis = new Redis({
  url: url,
  token: token,
});

async function testConnection() {
  try {
    console.log('🚀 Test de connexion Redis...');
    console.log('URL:', url);
    console.log('Token:', token.substring(0, 10) + '...');
    
    const result = await redis.ping();
    console.log('🔗 Test de connexion Redis réussi:', result);
    
    // Test d'écriture et de lecture
    await redis.set('test-key', 'Hello Upstash!', { ex: 60 });
    const value = await redis.get('test-key');
    console.log('✅ Test écriture/lecture Redis:', value);
    
    // Nettoyage
    await redis.del('test-key');
    console.log('🧹 Nettoyage effectué');
    
    console.log('🎉 Configuration Upstash Redis validée avec succès!');
  } catch (error) {
    console.error('❌ Erreur de connexion Redis:', error instanceof Error ? error.message : error);
  }
}

testConnection();
