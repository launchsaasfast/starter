# Configuration des Redirections Supabase

## Configuration critique dans le Dashboard Supabase

**IMPORTANT** : Vous DEVEZ configurer ces URLs dans votre dashboard Supabase pour que les redirections fonctionnent.

1. **Allez dans votre dashboard Supabase** : https://supabase.com/dashboard/project/fxwlqjnkvydztcgpvnwa

2. **Allez dans Authentication > URL Configuration**

3. **Dans "Site URL"**, mettez votre URL de base** :
   ```
   http://localhost:3000
   ```

4. **Dans "Redirect URLs"**, ajoutez TOUTES ces URLs** :
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/verify
   http://localhost:3000/auth/reset-password
   http://localhost:3000/**
   ```
   
5. **Dans "Email Templates"**, vérifiez que les templates utilisent les bonnes URLs** :
   - **Confirm signup** : `{{ .SiteURL }}/auth/verify?token={{ .Token }}&type=signup`
   - **Magic Link** : `{{ .SiteURL }}/auth/verify?token={{ .Token }}&type=magiclink`
   - **Change Email Address** : `{{ .SiteURL }}/auth/verify?token={{ .Token }}&type=email_change`
   - **Reset Password** : `{{ .SiteURL }}/auth/reset-password?token={{ .Token }}&type=recovery`

## Variables d'environnement requises

Assurez-vous d'avoir ces variables dans votre `.env.local` :

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://fxwlqjnkvydztcgpvnwa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
```

## Comment ça fonctionne maintenant

### Inscription (Signup)
- L'utilisateur s'inscrit
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/callback?code=...&type=signup`
- La page `/auth/callback` gère la session et redirige vers `/settings`
- La page `/auth/verify` peut aussi gérer les anciens formats de token

### Changement d'email  
- L'utilisateur change son email via le widget dans `/settings`
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/verify?token=...&type=email_change`
- La page `/auth/verify` gère la vérification et redirige vers `/settings`

### Reset password
- L'utilisateur demande un reset de mot de passe
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/reset-password?token=...&type=recovery`
- La page `/auth/reset-password` gère la vérification du token et la mise à jour du mot de passe

## Pages créées/mises à jour

1. **`/app/auth/verify/page.tsx`** - Page pour gérer les vérifications avec tokens (email change, recovery)
2. **`/app/auth/callback/page.tsx`** - Nouvelle page pour gérer les callbacks d'authentification (signup, social auth)
3. **`/app/auth/reset-password/page.tsx`** - Page mise à jour pour gérer les nouveaux tokens
4. **`/auth.ts`** - Configuration centralisée des URLs de redirection
5. Routes API mises à jour pour utiliser les bonnes URLs de redirection

## Test des redirections

1. Créez un nouveau compte → Vous devriez recevoir un email qui redirige vers `/auth/verify`
2. Demandez un reset de mot de passe → Vous devriez recevoir un email qui redirige vers `/auth/reset-password`
3. Changez votre email depuis `/settings` → Vous devriez recevoir un email qui redirige vers `/auth/verify`
