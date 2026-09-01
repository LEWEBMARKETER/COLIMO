# Suppression de compte utilisateur — COLIMO

Permet à l'admin de supprimer un compte (client, coursier, commerçant)
directement depuis le back-office (pages **Clients**, **Coursiers**,
**Commerçants**), au lieu de manipuler `auth.users` ou `utilisateurs`
directement dans Supabase.

## Pourquoi ce n'est pas un simple `DELETE`

Un compte qui a de l'historique (courses, paiements, avis, messages,
litiges, notifications...) ne peut pas être réellement supprimé sans casser
ces données : la quasi-totalité des colonnes qui référencent
`utilisateurs(id)` sont en `ON DELETE RESTRICT` (comportement par défaut de
Postgres, jamais changé) — seules `coursiers.utilisateur_id` et
`commercants.utilisateur_id` sont en `CASCADE`. Supprimer directement une
ligne `auth.users` avec de l'historique échoue donc avec une violation de
contrainte de clé étrangère.

## Comportement

La route serveur `apps/admin/app/api/utilisateurs/[id]/route.ts`
(`DELETE`) :

1. Vérifie que l'appelant est un admin authentifié (même contrôle que
   `middleware.ts`, revérifié indépendamment — un Route Handler n'est pas
   protégé par le middleware de navigation).
2. **Tente une suppression réelle** (`supabase.auth.admin.deleteUser`) —
   fonctionne pour un compte jamais utilisé (aucune course, aucun profil
   coursier/commerçant avec activité). Cascade proprement jusqu'à
   `utilisateurs`, `coursiers`, `commercants`.
3. **Si ça échoue** (contrainte de clé étrangère — le compte a de
   l'historique), bascule sur :
   - anonymisation des données personnelles (`nom`, `prénom`, `téléphone`,
     `photo_url`, `zone` sur `utilisateurs` ; `adresse`/`responsable`/
     `whatsapp`/`photo_commerce_url` sur `commercants` ; `documents`/
     `piece_identite_url` sur `coursiers`) — **l'historique de
     courses/paiements/avis n'est jamais touché**, il reste intact pour la
     comptabilité et les litiges en cours ;
   - bannissement définitif de la connexion (`ban_duration` ~100 ans côté
     Supabase Auth) — le compte ne peut plus jamais se reconnecter, même
     s'il connaît toujours son mot de passe (`statut='desactive'` seul ne
     suffit pas : rien dans l'app ne bloque une connexion réussie sur ce
     champ, contrairement au blocage fonctionnel déjà en place pour les
     coursiers suspendus).
4. Historise l'action (`historique_suppressions_compte` — qui, quand,
   quel mode, motif optionnel), lecture admin uniquement.

Comptes protégés : impossible de supprimer un compte admin, ni de supprimer
son propre compte, depuis cette route.

## Pourquoi une route serveur (nouveauté dans ce projet)

Jusqu'ici, toute action admin privilégiée passait par une RPC Postgres
`security definer` (voir `activer_abonnement_commerce`, etc.) — aucun
backend n'existait. Ici, ça ne suffit pas : révoquer l'accès à Supabase
Auth (suppression réelle ou bannissement) nécessite la **clé service-role**,
qui ne doit jamais être exposée au navigateur. `apps/admin` étant une
application Next.js sur Vercel, elle dispose d'un environnement d'exécution
serveur légitime (Route Handlers) — c'est la première route API de ce
projet.

## Configuration requise (à faire une fois, côté Vercel)

Sur le projet Vercel **`colimo-admin`** → Settings → Environment
Variables, ajouter :

```
SUPABASE_SERVICE_ROLE_KEY = <clé service_role du projet Supabase>
```

(⚠️ **sans** préfixe `NEXT_PUBLIC_` — sinon elle serait exposée côté
navigateur). La clé se trouve dans le dashboard Supabase → **Project
Settings → API → Project API keys → `service_role`** (secret, jamais la
clé `anon`). Sans cette variable, la route répond une erreur 500 explicite
plutôt que d'échouer silencieusement.

## Migration à appliquer

`supabase/migrations/0036_suppression_comptes.sql` — crée uniquement la
table d'audit `historique_suppressions_compte` (aucune modification des
tables existantes).

## Vérification effectuée

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/admin typecheck` : OK
- `pnpm --filter @colimo/admin build` (route `/api/utilisateurs/[id]`
  générée en dynamique) : OK
- **Non testé en conditions réelles** (nécessite `SUPABASE_SERVICE_ROLE_KEY`
  configurée sur Vercel + la migration appliquée) — à valider par
  l'utilisateur : un compte de test sans historique doit disparaître
  entièrement, un compte avec historique doit être anonymisé et ne plus
  pouvoir se reconnecter.
