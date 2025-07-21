# Roadmap Détaillée du projet Starter

Ce document structure les tâches à accomplir, réparties en phases claires, pour mener à bien l’implémentation de l’authentification Mazeway.

---

## Phase 0 – Préparation & Validation (1–2 jours)
- [ ] Vérifier la configuration Supabase
  - Exécuter `supabase/schema.sql` dans l’éditeur SQL
  - Valider la création des tables (`users`, `devices`, `device_sessions`, etc.) et triggers RLS
- [ ] Mettre à jour et vérifier les variables d’environnement (`.env.local` et `.env.example`)
- [ ] Initialiser le dépôt Git & branch protection
- [ ] Configurer CI/CD basique (lint, prettier, tests unitaires)

## Phase 1 – Core API & Logique Métier (3–5 jours)
1. **Routes d’authentification**
   - Signup, login, logout (`/api/auth/*`)
   - Reset-password, callback OAuth, confirm email
   - Tests d’intégration Postman ou Jest
2. **Gestion 2FA & Codes**
   - Endpoints pour générer / valider codes (`verification_codes`)
   - Backup codes CRUD
3. **Device Sessions & Trust Score**
   - Routes pour lister, révoquer sessions (`device_sessions`)
   - Calcul `calculateTrustScore` dans `utils/auth`
4. **Account Events & Email Alerts**
   - Endpoint de journalisation (`account_events`)
   - Intégration Resend / Supabase SMTP pour alertes
5. **Rate Limiting**
   - Middleware global rate-limit (Upstash Redis)
   - Configurer règles tiered limits (auth, SMS, exports)

## Phase 2 – UI / Composants & Expérience (4–6 jours)
1. **Formulaires Auth**
   - `AuthForm` (login/signup) + validation `useFormField`
   - Gestion d’erreurs et toasts (`useToast`)
2. **Flow 2FA**
   - Composant `2FASetupDialog` pour enrolment
   - Page challenge 2FA avec saisie code et backup codes
3. **Gestion Device Sessions**
   - `DeviceSessionsList` : vue, révocation en un clic
   - Alertes visuelles (toast) et confirmations modales
4. **Export de données**
   - Composant `DataExport` + appel `POST /api/data-exports`
   - Affichage de la progression et gestion des erreurs
5. **Paramètres & Profil**
   - Page Settings : modification email, mot de passe, préférences 2FA
   - Affichage activité (account_events)

## Phase 3 – Tests & Assurance Qualité (2–3 jours)
- [ ] Tests unitaires (Jest) sur utilitaires (hash, calcul score, tokens)
- [ ] Tests d’intégration API (Supertest / Jest)
- [ ] Tests end-to-end (Playwright ou Cypress) pour flows critiques
- [ ] Audit de sécurité (s’assurer de l’absence de fuites RLS)

## Phase 4 – Déploiement & Production (2–3 jours)
- [ ] Préparer `.env.production` et variables secrets dans plateforme (Vercel, Netlify)
- [ ] Dumper et importer le schéma en production (`supabase db dump`)
- [ ] Configurer Supabase prod : buckets, RLS, email templates, redirect URLs
- [ ] Déployer l’application (Vercel) et vérifier flows (signup, login, 2FA)
- [ ] Activer pg_cron pour cleanup automatique

## Phase 5 – Monitoring & Maintenance (continu)
- [ ] Logs et alertes (Sentry, Supabase logs)
- [ ] Dashboards de monitoring (Supabase, Upstash)
- [ ] Mise à jour des dépendances et audit sécurité régulier
- [ ] Réunions de revue bi-mensuelle pour évaluer la tech debt et backlog

---

*Utilisez cette structure pour répartir les tâches en sprints et suivre l’avancement.*