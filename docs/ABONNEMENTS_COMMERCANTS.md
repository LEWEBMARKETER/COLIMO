# Abonnements commerçants (COLIMO PRO)

Trois paliers pour les comptes commerçants — Gratuit, Starter (10 000
FCFA/mois), Business (25 000 FCFA/mois). La commande de courses reste
**gratuite pour tous les commerces**, avec ou sans abonnement : le forfait
ne débloque que des outils professionnels supplémentaires (carnet de
destinataires, adresses, tableau de bord avancé, exports, multi-comptes,
multi-points de départ, coursiers favoris). Paiement **hors plateforme**
en V1 (Airtel Money, Moov Money, virement...), activation manuelle par
l'admin — l'architecture est conçue pour qu'un paiement en ligne puisse
être branché en V2 sans refonte.

## Modèle de données

### `commercants` — colonnes ajoutées

`subscription_plan` (`gratuit|starter|business`, ce que l'admin a activé en
dernier — reste `starter`/`business` même après expiration, c'est une trace,
pas l'état effectif), `abonnement_debute_le`, `abonnement_expire_le`,
`abonnement_suspendu`.

**Le palier effectif n'est jamais stocké tel quel** — il est dérivé à la
lecture (`calculerPlanEffectif` côté TS, `plan_effectif_commerce()` côté
SQL, même principe que le statut "occupé" des coursiers) : un abonnement
expiré ou suspendu retombe automatiquement à `gratuit`, sans tâche
planifiée (le projet n'a pas d'infrastructure cron/Edge Function).

### Sécurité — verrouillage des colonnes d'abonnement

`commercants_update_own_or_admin` (RLS existante depuis 0011) autorise déjà
le propriétaire à écrire n'importe quelle colonne de sa propre ligne — sans
protection, un commerçant aurait pu s'auto-attribuer le Pack Business via un
appel API direct. `proteger_colonnes_privilegiees_commercants` (trigger
`BEFORE UPDATE`, migration 0031, même pattern que l'audit de sécurité
0028-0030) verrouille les 4 colonnes ci-dessus pour toute session non-admin.

### Tables (migrations 0031-0034, même découpage que le module Coursiers)

- **`demandes_abonnement`** — une demande d'activation/renouvellement
  (`statut` : demande_envoyee → ... → active/refuse/expire). Écriture
  exclusivement via RPC (`demander_activation_abonnement`,
  `refuser_demande_abonnement`).
- **`historique_abonnements`** — audit append-only (activation,
  renouvellement, désactivation, suspension, réactivation, refus). Lecture
  admin uniquement.
- **`configuration_paiement_abonnements`** — ligne unique, admin-éditable
  (numéro de paiement, bénéficiaire, moyen, instructions, WhatsApp, email).
  Jamais codée en dur, contrairement à `COMPTE_AIRTEL_MONEY_COLIMO`
  (paiement des courses) qui lui reste hardcodé.
- **`commerce_membres`** / **`invitations_commerce`** — équipe Pack
  Business (jusqu'à 3 sous-comptes). Le propriétaire principal est
  auto-inscrit `administrateur` à la création de sa fiche commerce. Un
  sous-compte s'inscrit lui-même via un **code d'invitation** (l'architecture
  actuelle — apps Next.js/Expo parlant directement à Supabase via RLS, sans
  backend custom ni Edge Functions — ne permet pas de créer un compte
  Supabase Auth au nom d'un tiers sans clé service-role côté serveur).
- **`commerce_destinataires`** (Starter, max 100), **`commerce_adresses_favorites`**
  (Starter, max 10), **`commerce_points_depart`** (Business), **`commerce_coursiers_favoris`**
  (Business) — chacune protégée par un trigger `BEFORE INSERT` qui vérifie
  le palier effectif et la limite ; la lecture/suppression reste toujours
  possible même après un downgrade (aucune donnée perdue).
- **`courses.destinataire_carnet_id`** / **`courses.point_depart_id`** —
  colonnes additives, aucun impact sur le flux de commande existant.

### Helpers SQL réutilisables

`commerce_id_pour_utilisateur(uuid)` (résout propriétaire ou membre invité),
`plan_effectif_commerce(uuid)` (même dérivation que côté TS) — utilisés dans
toutes les policies/triggers de gating des fonctionnalités premium.

## Sécurité — respect de la section 13 du besoin

Aucune restriction n'est appliquée uniquement côté frontend :
- Les colonnes d'abonnement sont verrouillées par trigger (ci-dessus).
- La création de destinataires/adresses/points de départ/coursiers favoris
  au-delà du palier ou de la limite est bloquée par un trigger `BEFORE INSERT`
  avec un message explicite, pas seulement un bouton grisé.
- Les RPC d'administration (`activer_abonnement_commerce`, etc.) vérifient
  `current_user_type() = 'admin'` avant toute écriture.
- `creer_invitation_commerce`/`rejoindre_commerce` revérifient la limite de
  3 sous-comptes à chaque étape (création ET utilisation du code).

## Notifications (Communication Center)

`abonnement_demande_recue`, `abonnement_active`, `abonnement_expire`,
`abonnement_refuse` (canal push, in-app). Pas de rappel proactif "expire
dans X jours" poussé par notification — affiché de façon réactive dans le
tableau de bord commerçant (`joursAvantExpiration`), faute d'infrastructure
cron dans ce projet.

## UI

- **Mobile** : `CommerceDashboard.tsx` (badge d'abonnement, bannière de
  renouvellement, stats du mois, stats avancées Business, section "COLIMO
  PRO"), écran `commerce/decouvrir.tsx` (matrice des 3 paliers, demande
  d'activation, instructions de paiement), écrans premium
  (`commerce/destinataires.tsx`, `adresses.tsx`, `equipe.tsx`,
  `coursiers-favoris.tsx`, `export.tsx`), route d'inscription
  `(auth)/rejoindre-commerce.tsx`. `nouvelle-livraison.tsx` reçoit des
  sélecteurs additifs (destinataire enregistré, point de départ) — le
  comportement par défaut (aucune sélection) reste identique à avant.
- **Export** : PDF (Starter, `expo-print`) et Excel (Business, `xlsx` +
  `expo-file-system` + `expo-sharing`) — nouvelles dépendances ajoutées à
  `apps/mobile/package.json`.
- **Admin** : `/commercants` converti en page à onglets (Liste inchangée +
  Abonnements [dashboard, demandes, activation manuelle] + Historique +
  Paramètres [infos de paiement]). Badge "Business" dans `/litiges` et
  `/annulations` (support prioritaire, identification visuelle uniquement).

## Vérification effectuée

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/admin typecheck`,
  `--filter @colimo/mobile typecheck` : OK
- `pnpm --filter @colimo/admin build` (route `/commercants` à onglets
  générée) : OK
- `pnpm --filter @colimo/mobile build:web` (897 modules, inclut les
  nouvelles dépendances d'export) : OK

**Limite explicite** : les dépendances natives (`expo-print`,
`expo-file-system`, `expo-sharing`) ne peuvent être exercées que par leur
bundling dans cet environnement — la génération réelle de PDF/Excel sur
appareil reste à valider par l'utilisateur après merge.

## Migrations à appliquer

Dans l'ordre, dans le SQL Editor Supabase :
1. `supabase/migrations/0031_abonnements_schema.sql`
2. `supabase/migrations/0032_abonnements_equipe.sql`
3. `supabase/migrations/0033_abonnements_outils_premium.sql`
4. `supabase/migrations/0034_abonnements_rpc_administration.sql`
