'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabaseClient';

function AuthCallbackContent() {client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabaseClient';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Authentification en cours...');

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        const supabase = createClientSupabaseClient();
        
        // Récupérer tous les paramètres
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const type = searchParams.get('type');
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');

        console.log('Auth callback params:', { 
          code: !!code, 
          error, 
          errorDescription, 
          type, 
          accessToken: !!accessToken, 
          refreshToken: !!refreshToken 
        });

        // Gérer les erreurs
        if (error) {
          setStatus('error');
          setMessage(errorDescription || error);
          setTimeout(() => router.push('/auth/signin?error=callback_error'), 3000);
          return;
        }

        // Gérer les différents types de callback
        if (type === 'recovery' || (code && searchParams.get('type') === 'recovery')) {
          // Rediriger vers reset-password avec le code
          const params = new URLSearchParams();
          if (code) params.set('code', code);
          if (type) params.set('type', type);
          router.push(`/auth/reset-password?${params.toString()}`);
          return;
        }

        // Gérer session avec access_token et refresh_token (ancien format)
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Erreur lors de la création de session: ' + sessionError.message);
            setTimeout(() => router.push('/auth/signin?error=session_error'), 3000);
          } else {
            setStatus('success');
            setMessage('Authentification réussie !');
            setTimeout(() => router.push('/settings'), 1000);
          }
          return;
        }

        // Vérifier s'il y a déjà une session active
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setMessage('Erreur lors de la vérification de session');
          setTimeout(() => router.push('/auth/signin?error=session_check_error'), 3000);
          return;
        }

        if (data.session) {
          // Session active, rediriger vers le dashboard
          setStatus('success');
          setMessage('Authentification réussie !');
          setTimeout(() => router.push('/settings'), 1000);
        } else {
          // Pas de session, mais pas d'erreur non plus
          // Peut-être un lien de vérification email
          if (code) {
            // Rediriger vers verify avec le code
            router.push(`/auth/verify?code=${code}&type=${type || 'signup'}`);
          } else {
            setStatus('error');
            setMessage('Aucune session trouvée');
            setTimeout(() => router.push('/auth/signin'), 3000);
          }
        }
      } catch (error) {
        console.error('Unexpected auth callback error:', error);
        setStatus('error');
        setMessage('Erreur inattendue');
        setTimeout(() => router.push('/auth/signin?error=unexpected_error'), 3000);
      }
    }

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-8 h-8 mx-auto text-green-600">✓</div>
            <p className="text-green-600">{message}</p>
            <p className="text-sm text-gray-500">Redirection...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-8 h-8 mx-auto text-red-600">✗</div>
            <p className="text-red-600">{message}</p>
            <p className="text-sm text-gray-500">Redirection vers la connexion...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
