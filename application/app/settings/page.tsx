'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, User, Shield, Lock, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type UserProfile = {
  email: string;
  name?: string;
  avatar?: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer le profil utilisateur
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = await api.user.getProfile();
        setUser(userData);
      } catch (error) {
        toast.error('Erreur lors du chargement du profil');
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  async function handleLogout() {
    try {
      await api.auth.logout();
      toast.success('Déconnexion réussie');
      router.push('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Erreur de chargement du profil</p>
          <Button onClick={() => router.push('/auth/signin')} className="mt-4">
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
              <SettingsIcon className="h-6 w-6 text-slate-900" />
            </div>
            <h1 className="text-3xl font-bold text-white">Paramètres</h1>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
          >
            Se déconnecter
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profil utilisateur */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil utilisateur
              </CardTitle>
              <CardDescription>
                Informations de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{user.name || 'Utilisateur'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changer l'email */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Adresse email
              </CardTitle>
              <CardDescription>
                Modifier votre adresse email de connexion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Email actuel</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                
                <Button 
                  onClick={() => router.push('/settings/change-email')}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Changer mon adresse email
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  🔒 Processus sécurisé en 2 étapes avec confirmation par email
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sécurité */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Paramètres de sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Mot de passe</p>
                    <p className="text-sm text-muted-foreground">
                      Dernière modification il y a plus de 30 jours
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Modifier
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Authentification à deux facteurs</p>
                    <p className="text-sm text-muted-foreground">
                      Non configurée (Recommandé)
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Activer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>
                Gestion du compte et préférences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Préférences de notification
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Historique de sécurité
              </Button>
              <Separator />
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => toast.error('Fonctionnalité en développement')}
              >
                Supprimer le compte
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
