'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Mail, User, Shield, Lock, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Schema de validation pour le changement d'email
const changeEmailSchema = z.object({
  newEmail: z.string().email('Format d\'email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type UserProfile = {
  email: string;
  name?: string;
  avatar?: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Form pour changer l'email
  const emailForm = useForm<z.infer<typeof changeEmailSchema>>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      newEmail: '',
      password: '',
    },
  });

  // Récupérer le profil utilisateur
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = await api.user.getProfile();
        setUser(userData);
        emailForm.setValue('newEmail', userData.email); // Pré-remplir avec l'email actuel
      } catch (error) {
        toast.error('Erreur lors du chargement du profil');
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router, emailForm]);

  // Fonction pour changer l'email
  async function onEmailSubmit(values: z.infer<typeof changeEmailSchema>) {
    try {
      setIsChangingEmail(true);
      await api.auth.changeEmail(values.newEmail, values.password);
      toast.success('Email mis à jour avec succès ! Vérifiez votre nouvelle adresse email.');
      emailForm.reset();
      
      // Rafraîchir le profil
      const updatedUser = await api.user.getProfile();
      setUser(updatedUser);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du changement d\'email');
    } finally {
      setIsChangingEmail(false);
    }
  }

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
                Changer l'email
              </CardTitle>
              <CardDescription>
                Modifier votre adresse email de connexion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="newEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouvelle adresse email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@nouvel-email.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={emailForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirmez avec votre mot de passe"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isChangingEmail}
                  >
                    {isChangingEmail ? 'Mise à jour...' : 'Mettre à jour l\'email'}
                  </Button>
                </form>
              </Form>
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
