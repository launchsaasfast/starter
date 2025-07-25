'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  
  // Gérer différents types de tokens
  const token = searchParams.get('token') || '';
  const code = searchParams.get('code') || '';
  const type = searchParams.get('type') || '';
  const accessToken = searchParams.get('access_token') || '';
  const refreshToken = searchParams.get('refresh_token') || '';

  useEffect(() => {
    async function verifyToken() {
      // Récupérer tous les paramètres possibles
      const token = searchParams.get('token');
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      console.log('Reset password params:', { token, code, type, accessToken, refreshToken });

      // Si on a un token de récupération direct
      if (token && type === 'recovery') {
        setTokenValid(true);
        return;
      }

      // Si on a un code (format pkce), on l'accepte aussi
      if (code) {
        setTokenValid(true);
        return;
      }

      // Si on a access_token (ancien format)
      if (accessToken) {
        setTokenValid(true);
        return;
      }

      // Sinon on affiche une erreur avec debug info
      setError('Token de récupération manquant. Paramètres reçus: ' + JSON.stringify({
        token: !!token,
        code: !!code,
        type,
        accessToken: !!accessToken,
        allParams: Object.fromEntries(searchParams.entries())
      }));
    }

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      
      // Détecter le token à utiliser (token, code, ou access_token)
      const verificationToken = token || code;
      
      if (verificationToken && type === 'recovery') {
        // Nouveau système: d'abord vérifier le token de récupération
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: verificationToken,
          type: 'recovery'
        });
        
        if (verifyError) {
          setError('Code de récupération invalide: ' + verifyError.message);
          return;
        }
        
        // Ensuite changer le mot de passe
        const { error: updateError } = await supabase.auth.updateUser({ 
          password: password 
        });
        
        if (updateError) {
          setError('Erreur lors de la mise à jour du mot de passe: ' + updateError.message);
        } else {
          setMessage('Mot de passe mis à jour avec succès !');
          setTimeout(() => router.push('/auth/signin'), 2000);
        }
      } else if (verificationToken) {
        // Essayer comme token de récupération générique
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: verificationToken,
          type: 'recovery'
        });
        
        if (verifyError) {
          setError('Code de récupération invalide: ' + verifyError.message);
          return;
        }
        
        // Ensuite changer le mot de passe
        const { error: updateError } = await supabase.auth.updateUser({ 
          password: password 
        });
        
        if (updateError) {
          setError('Erreur lors de la mise à jour du mot de passe: ' + updateError.message);
        } else {
          setMessage('Mot de passe mis à jour avec succès !');
          setTimeout(() => router.push('/auth/signin'), 2000);
        }
      } else if (accessToken && refreshToken) {
        // Ancien système avec session tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          setError('Session invalide: ' + sessionError.message);
          return;
        }
        
        const { error: updateError } = await supabase.auth.updateUser({ 
          password: password 
        });
        
        if (updateError) {
          setError('Erreur lors de la mise à jour du mot de passe: ' + updateError.message);
        } else {
          setMessage('Mot de passe mis à jour avec succès !');
          setTimeout(() => router.push('/auth/signin'), 2000);
        }
      } else {
        setError('Token de récupération manquant ou invalide');
      }
    } catch (err) {
      setError('Erreur réseau. Veuillez réessayer.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Vérification du token...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Réinitialiser le mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!tokenValid && error ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
              <Button 
                onClick={() => router.push('/auth/forgot-password')}
                className="w-full"
              >
                Demander un nouveau lien
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Au moins 8 caractères"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Répétez le mot de passe"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {message && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-sm">{message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !tokenValid}
                className="w-full"
              >
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => router.push('/auth/signin')}
              className="text-sm"
            >
              ← Retour à la connexion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
