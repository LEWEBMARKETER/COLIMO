# Brancher COLIMO sur Supabase — guide étape par étape

Ce guide part du principe que le projet Supabase `cynivhfxbvbugxeirfba` existe déjà.
Objectif : appliquer le schéma, puis récupérer les deux informations dont j'ai besoin
pour brancher le code (aucune n'est secrète au sens strict — l'URL et la clé `anon`
sont faites pour être utilisées côté client).

## Étape 1 — Appliquer le schéma à la base

Deux façons de faire, choisis celle qui te convient.

### Option A — Via le dashboard (le plus simple, aucune installation)

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) et ouvre le projet COLIMO
2. Dans le menu de gauche, clique sur **SQL Editor**
3. Clique sur **New query**
4. Ouvre le fichier `supabase/migrations/0001_init_schema.sql` du repo, copie tout son contenu
5. Colle-le dans l'éditeur SQL et clique sur **Run**
6. Vérifie dans **Table Editor** (menu de gauche) que les 5 tables sont bien créées :
   `utilisateurs`, `coursiers`, `courses`, `transactions`, `notations`

### Option B — Via le CLI Supabase (si tu préfères garder l'historique de migrations proprement)

Sur ta machine (pas dans cette session, qui n'a pas accès au réseau Supabase) :

```bash
npm install -g supabase
supabase login --token <ton_token_d_acces>
cd chemin/vers/COLIMO
supabase link --project-ref cynivhfxbvbugxeirfba -p <mot_de_passe_de_la_base>
supabase db push
```

`supabase db push` applique tous les fichiers de `supabase/migrations/` dans l'ordre.

## Étape 2 — Activer l'authentification email/mot de passe

1. Dans le dashboard, va dans **Authentication** → **Providers**
2. Vérifie que **Email** est activé (c'est le cas par défaut normalement)
3. Dans **Authentication** → **Settings**, tu peux désactiver la confirmation par email
   si tu veux simplifier les tests pendant cette phase (« Confirm email » → off) —
   à réactiver avant l'ouverture publique

*(On basculera vers l'authentification par SMS/OTP dans une itération ultérieure,
une fois un fournisseur SMS choisi — voir la discussion précédente.)*

## Étape 3 — Récupérer l'URL et la clé publique du projet

1. Dans le dashboard, va dans **Settings** (icône engrenage) → **API**
2. Note deux valeurs :

    - **Project URL** (ressemble à `https://cynivhfxbvbugxeirfba.supabase.co`)
    - **anon public** key (une longue chaîne commençant par `eyJ...`)

**Ne me donne pas** la clé `service_role` (celle-ci a tous les droits et ne doit
jamais être utilisée côté client) ni le mot de passe de la base — je n'en ai pas
besoin pour cette étape.

## Étape 4 — Me transmettre ces deux valeurs

Une fois que tu as :

- l'URL du projet
- la clé `anon public`

donne-les-moi ici. Je m'en sers pour :

1. Ajouter `@supabase/supabase-js` au projet
2. Remplacer les appels au serveur simulé (`apps/api`) par de vrais appels Supabase
   dans `apps/admin` et `apps/mobile`
3. Configurer les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` côté admin ; `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` côté mobile)
4. Câbler l'inscription/connexion par email + mot de passe

Cette partie ne nécessite aucun accès réseau à Supabase depuis cette session —
je peux l'écrire dès que j'ai les deux valeurs.

## Étape 5 (plus tard) — Variables d'environnement en production

Quand on déploiera sur Vercel, ces mêmes valeurs seront à ajouter dans les
paramètres du projet Vercel (Environment Variables), pas committées dans le repo.
