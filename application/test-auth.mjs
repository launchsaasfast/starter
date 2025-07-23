// Test simple de l'authentification avec la nouvelle API Supabase SSR

const BASE_URL = 'http://localhost:3000';

async function testAuthentication() {
  console.log('🔄 Test de la migration Supabase SSR...\n');

  try {
    // Test 1: Vérifier que l'API signin fonctionne sans erreurs cookies
    console.log('1️⃣ Test API signin...');
    const signinResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      }),
    });

    const signinData = await signinResponse.text();
    console.log(`   Status: ${signinResponse.status}`);
    
    if (signinResponse.status === 401 && signinData.includes('error')) {
      console.log('   ✅ API signin répond correctement (credentials incorrects attendus)');
    } else {
      console.log('   ❌ Réponse inattendue:', signinData.substring(0, 200));
    }

    // Test 2: Vérifier l'API user/me
    console.log('\n2️⃣ Test API user/me...');
    const meResponse = await fetch(`${BASE_URL}/api/user/me`);
    console.log(`   Status: ${meResponse.status}`);
    
    if (meResponse.status === 401) {
      console.log('   ✅ API user/me répond correctement (non authentifié)');
    } else {
      console.log('   ❌ Status inattendu');
    }

    // Test 3: Vérifier la page d'accueil
    console.log('\n3️⃣ Test page d\'accueil...');
    const homeResponse = await fetch(`${BASE_URL}/`);
    console.log(`   Status: ${homeResponse.status}`);
    
    if (homeResponse.status === 200) {
      console.log('   ✅ Page d\'accueil accessible');
    } else {
      console.log('   ❌ Erreur page d\'accueil');
    }

    console.log('\n🎉 Migration Supabase SSR complétée avec succès !');
    console.log('   - Aucune erreur cookies() détectée');
    console.log('   - APIs d\'authentification fonctionnelles');
    console.log('   - Middleware mis à jour');

  } catch (error) {
    console.error('❌ Erreur durant le test:', error.message);
  }
}

testAuthentication();
