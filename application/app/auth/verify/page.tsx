'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleVerification() {
      // Récupérer tous les paramètres possibles
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');

      console.log('Verification params:', { token, code, type, access_token, refresh_token });

      // Vérifier qu'on a au moins un token ou code
      const verificationToken = token || code;
      
      if (!verificationToken && !access_token) {
        setStatus('error');
        setMessage('Token de vérification manquant. Paramètres reçus: ' + JSON.stringify({
          token: !!token,
          code: !!code,
          type,
          access_token: !!access_token,
          refresh_token: !!refresh_token,
          allParams: Object.fromEntries(searchParams.entries())
        }));
        return;
      }

      try {
        const supabase = createClientSupabaseClient();

        if (access_token && refresh_token) {
          // Ancien format avec access_token et refresh_token
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            setStatus('error');
            setMessage('Erreur lors de la vérification : ' + error.message);
          } else {
            setStatus('success');
            setMessage('Votre compte a été vérifié avec succès !');
            setTimeout(() => router.push('/settings'), 2000);
          }
        }
        else if (verificationToken) {
          // Nouveau format avec code ou token
          if (type === 'email_change') {
            // Pour le changement d'email, essayer les deux méthodes
            try {
              const { error } = await supabase.auth.verifyOtp({
                token_hash: verificationToken,
                type: 'email_change'
              });

              if (error) {
                // Si ça échoue, essayer comme token de signup
                const { error: signupError } = await supabase.auth.verifyOtp({
                  token_hash: verificationToken,
                  type: 'signup'
                });

                if (signupError) {
                  setStatus('error');
                  setMessage('Erreur lors de la vérification email : ' + (error.message || signupError.message));
                } else {
                  setStatus('success');
                  setMessage('Votre email a été mis à jour avec succès !');
                  setTimeout(() => router.push('/settings/email-success'), 2000);
                }
              } else {
                setStatus('success');
                setMessage('Votre email a été mis à jour avec succès !');
                setTimeout(() => router.push('/settings/email-success'), 2000);
              }
            } catch {
              setStatus('error');
              setMessage('Erreur lors de la vérification email');
            }
          }
          else if (type === 'signup') {
            const { error } = await supabase.auth.verifyOtp({
              token_hash: verificationToken,
              type: 'signup'
            });

            if (error) {
              setStatus('error');
              setMessage('Erreur lors de la vérification : ' + error.message);
            } else {
              setStatus('success');
              setMessage('Votre compte a été vérifié avec succès !');
              setTimeout(() => router.push('/settings'), 2000);
            }
          }
          else {
            // Essayer une vérification générique (signup par défaut)
            const { error } = await supabase.auth.verifyOtp({
              token_hash: verificationToken,
              type: 'signup'
            });

            if (error) {
              // Si ça échoue, essayer email_change
              const { error: emailError } = await supabase.auth.verifyOtp({
                token_hash: verificationToken,
                type: 'email_change'
              });

              if (emailError) {
                setStatus('error');
                setMessage('Erreur lors de la vérification : ' + (error.message || emailError.message));
              } else {
                setStatus('success');
                setMessage('Vérification réussie !');
                setTimeout(() => router.push('/settings'), 2000);
              }
            } else {
              setStatus('success');
              setMessage('Vérification réussie !');
              setTimeout(() => router.push('/settings'), 2000);
            }
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('Une erreur inattendue s\'est produite');
        console.error('Verification error:', error);
      }
    }

    handleVerification();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Vérification</CardTitle>
          <CardDescription>
            Vérification de votre compte en cours...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Vérification en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <div className="space-y-2">
                <p className="text-green-800 font-medium">Succès !</p>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500">
                  Redirection automatique dans quelques secondes...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-600" />
              <div className="space-y-2">
                <p className="text-red-800 font-medium">Erreur</p>
                <p className="text-gray-600">{message}</p>
              </div>
              <Button 
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                Retour à la connexion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
