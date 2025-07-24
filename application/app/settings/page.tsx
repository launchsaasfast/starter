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
import { Mail, User, Shield, Lock, Settings as SettingsIcon, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { TwoFactorSection } from '@/components/settings/two-factor-section';
import { Badge } from '@/components/ui/badge';

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
      } catch {
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
    } catch {
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
      <div className="container mx-auto px-4 max-w-6xl">
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Colonne de gauche - Profil et Actions */}
          <div className="space-y-6">
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
                    onClick={() => router.push('/settings/email')}
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

          {/* Colonne du milieu - Sécurité */}
          <div className="space-y-6">
            {/* 2FA */}
            <div className="bg-white/95 backdrop-blur-sm rounded-lg">
              <TwoFactorSection />
            </div>

            {/* Gestion mot de passe */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Mot de passe
                </CardTitle>
                <CardDescription>
                  Gérer votre mot de passe de connexion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Dernière modification : il y a 2 mois
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Nous recommandons de changer votre mot de passe régulièrement
                  </p>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={() => router.push('/auth/reset-password')}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Changer le mot de passe
                </Button>
                
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>✓ Utilisez au moins 8 caractères</p>
                  <p>✓ Combinez lettres, chiffres et symboles</p>
                  <p>✓ Évitez les mots de passe évidents</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne de droite - Activité et Dispositifs */}
          <div className="space-y-6">
            {/* Dispositifs connectés */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Dispositifs connectés
                </CardTitle>
                <CardDescription>
                  Gérer les appareils qui accèdent à votre compte
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dispositif actuel */}
                <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Cet appareil</p>
                        <p className="text-sm text-green-700">
                          Windows • Chrome • IP: 127.0.0.1
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Actif
                    </Badge>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Dernière activité : Maintenant
                  </p>
                </div>

                {/* Autres dispositifs (exemple) */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">iPhone 14</p>
                        <p className="text-sm text-muted-foreground">
                          Safari Mobile • IP: 192.168.1.45
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200">
                      Révoquer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Dernière activité : Il y a 2 jours
                  </p>
                </div>

                <Separator />
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => toast.info('Fonctionnalité en développement')}
                >
                  Voir tous les dispositifs
                </Button>
              </CardContent>
            </Card>

            {/* Activité récente */}
            <Card className="bg-white/95 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Activité de sécurité
                </CardTitle>
                <CardDescription>
                  Événements de sécurité récents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Connexion réussie</p>
                      <p className="text-xs text-muted-foreground">
                        Il y a 5 minutes • Chrome sur Windows
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Configuration 2FA</p>
                      <p className="text-xs text-muted-foreground">
                        Il y a 1 heure • Sécurité renforcée
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-2">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Nouvelle connexion</p>
                      <p className="text-xs text-muted-foreground">
                        Il y a 2 jours • iPhone Safari
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />
                
                <Button 
                  variant="outline" 
                  className="w-full text-sm"
                  onClick={() => toast.info('Fonctionnalité en développement')}
                >
                  Voir l'historique complet
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
