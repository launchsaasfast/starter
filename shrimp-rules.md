# Development Guidelines

## Project Overview
- Define le projet comme une fondation d'authentification auto-hébergée.
- Referencer `supabase/schema.sql`, `starter/docs` et `src/` pour toute modification liée à la logique métier.
- Ne pas inclure de règles de développement génériques ou déjà connues des LLMs.

## Project Architecture
- Organiser les modules en dossiers : `supabase/`, `src/components/`, `src/utils/`, `config/`, `docs/`.
- Mettre à jour simultanément les diagrammes dans `docs/component-architecture.md` lors de modifications de structure.
- Imposer la présence d’un trigger `updated_at` et d’une policy RLS pour chaque table dans `supabase/schema.sql`.

## Code Standards
- Utiliser camelCase pour les noms de variables et PascalCase pour les composants.
- Préfixer les types TypeScript par "T" dans `src/types/`.
- Valider toutes les entrées via `useFormField` et centraliser la logique de validation dans `src/utils/`.
- Mettre à jour `README.md` et `docs/readme.md` en parallèle lors de tout changement de commande CLI ou script.

## Functionality Implementation Standards
- Ajouter toute nouvelle route API dans `src/pages/api/` et documenter dans `docs/auth-workflows.md`.
- Créer les triggers DB dans `supabase/schema.sql` avant d’implémenter la logique côté serveur.
- Documenter chaque endpoint dans `docs/component-architecture.md` avec nom, méthode HTTP et rôle.

## Third-Party Usage Standards
- Toutes les intégrations externes (Supabase, Resend, Upstash, Trigger.dev) doivent être configurées via `config/auth.ts`.
- Mettre à jour `.env.example` et `.env.local` simultanément pour chaque nouvelle variable d’environnement.
- Interdiction d’installer des dépendances non listées dans `package.json` sans approbation explicite dans `docs/component-architecture.md`.

## Workflow Standards
- Respecter l’ordre : schéma DB → API routes → utilitaires → UI → tests.
- Mettre à jour la section "Getting started" du README à chaque nouveau script ou étape de setup.
- Versionner toutes les modifications SQL et JS dans Git avec des messages clairs : `[SQL] description` ou `[API] description`.

## Key File Interaction Standards
- Lors de la modification de `src/config/auth.ts`, synchroniser les exemples de configuration dans `docs/readme.md` et `docs/security-algorithms.md`.
- Toute modification des composants UI (`src/components/`) doit être reflétée dans `docs/component-architecture.md`.
- Lancer `npm run reset-project` après chaque mise à jour majeure de schéma pour valider l’intégrité.

## AI Decision-making Standards
- En cas d’ambiguïté sur l’emplacement d’une modification, privilégier `supabase/schema.sql` pour les schémas et `src/utils/` pour la logique.
- Si un nouveau workflow est ajouté, analyser `docs/auth-workflows.md` et proposer les changements structurés avant implémentation.
- Prioriser les modifications de sécurité (RLS, triggers, rate-limit) avant les ajouts de fonctionnalités.

## Prohibited Actions
- Ne pas ajouter de logique directement dans `node_modules` ou sans tests associés.
- Interdire les requêtes SQL sans RLS et triggers `updated_at`.
- Bloquer l’usage de solutions non standard pour la gestion des sessions ou la validation des mots de passe.
- Ne pas modifer README sans synchroniser les docs dans `starter/docs/`.

**Fin du document de règles.**
