// Test de connexion Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fxwlqjnkvydztcgpvnwa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d2xxam5rdnlkenRjZ3B2bndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTA4NjUsImV4cCI6MjA2ODY4Njg2NX0.p2f3aezUmzX-Ugnavp-I-5aDx7GYowrq9OWNgjUXf7U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Test de connexion à Supabase...');
    
    // Test simple de connexion
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
    } else {
      console.log('✅ Connexion Supabase réussie!');
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err.message);
  }
}

testConnection();
