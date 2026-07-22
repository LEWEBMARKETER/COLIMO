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

À faire : nouveau projet Vercel, Root Directory `apps/mobile`, variables :
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Compte administrateur

Aucune inscription admin en self-service. Pour créer le premier compte :

1. Dashboard Supabase → **Authentication → Users → Add user**
2. Noter l'UUID généré
3. Dans le **SQL Editor** :
   ```sql
   insert into utilisateurs (id, nom, telephone, type, statut)
   values ('<uuid>', 'Nom', '+241...', 'admin', 'actif');
   ```
