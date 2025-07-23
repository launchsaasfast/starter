'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        const supabase = createClientSupabaseClient();
        
        // Gérer le callback d'authentification
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/auth/signin?error=callback_error');
          return;
        }

        if (data.session) {
          // Utilisateur connecté, rediriger vers le dashboard
          router.push('/settings');
        } else {
          // Pas de session, rediriger vers la connexion
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        router.push('/auth/signin?error=unexpected_error');
      }
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Authentification en cours...</p>
      </div>
    </div>
  );
}
