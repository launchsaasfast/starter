'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleVerification() {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || !type) {
        setStatus('error');
        setMessage('Token ou type de vérification manquant');
        return;
      }

      try {
        const supabase = createClientSupabaseClient();

        if (type === 'signup') {
          // Vérification d'inscription
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
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
        else if (type === 'email_change') {
          // Vérification de changement d'email
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email_change'
          });

          if (error) {
            setStatus('error');
            setMessage('Erreur lors du changement d\'email : ' + error.message);
          } else {
            setStatus('success');
            setMessage('Votre email a été mis à jour avec succès !');
            setTimeout(() => router.push('/settings'), 2000);
          }
        }
        else {
          setStatus('error');
          setMessage('Type de vérification non supporté');
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
