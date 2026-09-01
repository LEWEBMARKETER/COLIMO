# Déploiement — COLIMO

## Back-office admin (Vercel)

- Projet Vercel : `colimo-admin` (équipe `lewebmarketer-1318`)
- Root Directory : `apps/admin`
- Production Branch : `main` (déploiement automatique à chaque fusion)
- Variables d'environnement :
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://cynivhfxbvbugxeirfba.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé publique du projet Supabase
  - `SUPABASE_SERVICE_ROLE_KEY` = clé secrète `service_role` du projet
    Supabase (**sans** préfixe `NEXT_PUBLIC_` — jamais exposée au
    navigateur) — nécessaire à la suppression de compte utilisateur
    (`app/api/utilisateurs/[id]/route.ts`), seule route serveur du projet.
    Voir `docs/SUPPRESSION_COMPTES.md`.

## App mobile / PWA (Vercel)

Nouveau projet Vercel (équipe `lewebmarketer-1318`), configuré ainsi :
  - Root Directory : `apps/mobile`
  - Framework Preset : `Other` (ce n'est pas du Next.js, c'est un export web Expo)
  - Build Command : `cd ../.. && pnpm --filter @colimo/mobile build:web`
    (remonte explicitement à la racine du monorepo avant de filtrer le
    package — évite les erreurs `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` /
    `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` liées à un cwd ambigu sur Vercel)
  - Output Directory : `dist`
  - Install Command : par défaut (Vercel détecte pnpm via `pnpm-lock.yaml` à la racine du monorepo)
  - Variables d'environnement :
    - `EXPO_PUBLIC_SUPABASE_URL` = `https://cynivhfxbvbugxeirfba.supabase.co`
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = clé publique du projet Supabase
  - Production Branch : `main` (confirmé — Vercel déploie automatiquement à
    chaque fusion dans `main`, jamais depuis la branche de travail)

`build:web` lance `expo export -p web` puis `scripts/inject-pwa-head.js`, qui
complète `dist/index.html` (manifest PWA, icônes `192`/`512`, apple-touch-icon,
`theme-color`) — nécessaire car cette version d'Expo (export web en mode
`single`/SPA) ne génère ni manifest ni balises d'icônes elle-même. Sans ça,
"Ajouter à l'écran d'accueil" utilise une icône générée par le navigateur
(floue) au lieu du logo COLIMO. Les icônes sources sont dans
`apps/mobile/assets/` (`icon.png`/`adaptive-icon.png`, pleine résolution,
sans marge) ; leurs déclinaisons servies telles quelles sont dans
`apps/mobile/public/` (copié tel quel dans `dist/` au build).

Une fois déployée, l'app mobile web sert à la fois les comptes **client** et
**coursier** (inscription + connexion par email/mot de passe, navigation
selon le type de compte).

## Compte administrateur

Aucune inscription admin en self-service. Pour créer le premier compte :

1. Dashboard Supabase → **Authentication → Users → Add user**
2. Noter l'UUID généré
3. Dans le **SQL Editor** :
   ```sql
   insert into utilisateurs (id, nom, telephone, type, statut)
   values ('<uuid>', 'Nom', '+241...', 'admin', 'actif');
   ```
