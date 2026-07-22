# Déploiement — COLIMO

## Back-office admin (Vercel)

- Projet Vercel : `colimo-admin` (équipe `lewebmarketer-1318`)
- Root Directory : `apps/admin`
- Branche de production à utiliser : `claude/colimo-project-analysis-tg9vqv`
  (à changer vers `main` une fois la branche fusionnée)
- Variables d'environnement :
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://cynivhfxbvbugxeirfba.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé publique du projet Supabase

## App mobile / PWA (Vercel)

Nouveau projet Vercel (équipe `lewebmarketer-1318`), configuré ainsi :
  - Root Directory : `apps/mobile`
  - Framework Preset : `Other` (ce n'est pas du Next.js, c'est un export web Expo)
  - Build Command : `pnpm build:web`
  - Output Directory : `dist`
  - Install Command : par défaut (Vercel détecte pnpm via `pnpm-lock.yaml` à la racine du monorepo)
  - Variables d'environnement :
    - `EXPO_PUBLIC_SUPABASE_URL` = `https://cynivhfxbvbugxeirfba.supabase.co`
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = clé publique du projet Supabase
  - Production Branch : `claude/colimo-project-analysis-tg9vqv` (à changer vers `main` une fois la branche fusionnée)

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
