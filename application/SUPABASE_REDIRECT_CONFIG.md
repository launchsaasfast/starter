# Configuration des Redirections Supabase

## URLs de redirection à configurer dans votre dashboard Supabase

1. **Allez dans votre dashboard Supabase** : https://supabase.com/dashboard/project/fxwlqjnkvydztcgpvnwa

2. **Allez dans Authentication > URL Configuration**

3. **Ajoutez ces URLs dans "Redirect URLs"** :
   ```
   http://localhost:3000/auth/verify
   http://localhost:3000/auth/reset-password
   https://votre-domaine.com/auth/verify
   https://votre-domaine.com/auth/reset-password
   ```

4. **Dans "Site URL"**, mettez votre URL de base** :
   ```
   http://localhost:3000
   https://votre-domaine.com
   ```

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
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/verify?token=...&type=signup`
- La page `/auth/verify` gère la vérification et redirige vers `/settings`

### Changement d'email  
- L'utilisateur change son email via le widget dans `/settings`
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/verify?token=...&type=email_change`
- La page `/auth/verify` gère la vérification et redirige vers `/settings`

### Reset password
- L'utilisateur demande un reset de mot de passe
- Supabase envoie un email avec le lien : `http://localhost:3000/auth/reset-password?token=...&type=recovery`
- La page `/auth/reset-password` gère la vérification du token et la mise à jour du mot de passe

## Pages créées/mises à jour

1. **`/app/auth/verify/page.tsx`** - Nouvelle page pour gérer tous les types de vérification
2. **`/app/auth/reset-password/page.tsx`** - Page mise à jour pour gérer les nouveaux tokens
3. **`/auth.ts`** - Configuration centralisée des URLs de redirection
4. Routes API mises à jour pour utiliser les bonnes URLs de redirection

## Test des redirections

1. Créez un nouveau compte → Vous devriez recevoir un email qui redirige vers `/auth/verify`
2. Demandez un reset de mot de passe → Vous devriez recevoir un email qui redirige vers `/auth/reset-password`
3. Changez votre email depuis `/settings` → Vous devriez recevoir un email qui redirige vers `/auth/verify`
