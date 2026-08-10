# Audit de sécurité — Août 2026

Audit du code applicatif (RLS Supabase, back-office admin, app mobile,
`packages/shared`) au stade actuel du projet, suivi de la remédiation de
tout ce qui pouvait être corrigé sans accès réseau direct à la base de
production (migrations SQL livrées à coller manuellement dans le SQL
Editor Supabase, comme pour tous les modules précédents).

## Constat de fond

Une policy RLS Postgres du type `using (id = auth.uid() or type_utilisateur()
= 'admin')` protège la **ligne** accessible, jamais les **colonnes**
modifiables à l'intérieur de cette ligne. Un utilisateur authentifié peut
toujours appeler l'API REST Supabase directement (en contournant l'app) avec
sa propre session et écrire n'importe quelle colonne de sa propre ligne. La
quasi-totalité des failles trouvées vient de ce même angle mort, sur des
tables différentes.

## Corrigé

### 1. Colonnes privilégiées verrouillées par trigger (migration `0028`)

Ajout de triggers `BEFORE INSERT/UPDATE` qui reviennent silencieusement à
l'ancienne valeur (ou rejettent la requête pour `utilisateurs`) pour toute
colonne privilégiée modifiée par une session non-admin :

- **`utilisateurs`** : `type` (auto-promotion admin) et `statut`
  (auto-réactivation après suspension) réservés à l'admin ; création directe
  d'un compte `type='admin'` via l'inscription standard bloquée.
- **`coursiers`** : `statut_verification`, `statut` (hors dérivation
  légitime du toggle "disponible"), `note_moyenne`, `niveau_id`, et tous les
  compteurs de livraisons — réservés à l'admin ou à la logique système
  interne (identifiée via un indicateur transaction-locale
  `colimo.systeme_interne`, posé par `maj_statistiques_coursier`,
  `maj_note_moyenne_coursier`, `definir_niveau_coursier`, et les nouvelles
  RPC badges).
- **`paiements`** : `statut` (le client ne peut que déclarer, jamais passer
  directement à `paiement_confirme`), `valide_par`/`valide_at` figés en
  écriture non-admin (sauf remise à `null`, nécessaire à la redéclaration
  après rejet).
- **`courses`** : `prix`, `reduction_promo`, `frais_retour` figés après
  création ; `coursier_id` seulement modifiable par le coursier qui s'assigne
  à lui-même une course non assignée (acceptation) — toute autre écriture
  (réattribution, désassignation) réservée à l'admin.

### 2. `badges_coursiers` : RLS ouverte convertie en RPC (migration `0029`)

Les policies `insert`/`update` étaient ouvertes à tout compte authentifié,
sans aucun contrôle : n'importe qui pouvait s'auto-attribuer ou retirer
n'importe quel badge sur n'importe quel coursier. La table est désormais
verrouillée en admin uniquement (`badges_coursiers_all_admin`) ; l'écriture
passe exclusivement par deux nouvelles RPC `security definer` —
`attribuer_badge_coursier` (idempotente) et `retirer_badge_coursier` — seul
point d'entrée légitime, y compris pour l'automatisation déclenchée depuis
une session client/coursier. `packages/shared/src/coursiers/badges/index.ts`
appelle désormais ces RPC au lieu d'écrire directement dans la table.

### 3. `notations` : vérification de participation (migration `0029`)

`notations_insert_auteur` ne vérifiait que `auteur_id = auth.uid()` : un
compte authentifié pouvait noter n'importe qui sur n'importe quelle course,
y compris une course à laquelle il n'a jamais participé — polluant
`note_moyenne` (recalculée automatiquement) de n'importe quel coursier. La
policy exige désormais l'existence d'une course `livree`/`confirmee` reliant
réellement l'auteur et le destinataire (dans un sens ou l'autre,
client→coursier ou coursier→client).

### 4. Buckets Storage sans limite (migration `0029`)

`avatars` et `documents` n'avaient ni limite de taille ni restriction de
type MIME. Ajout de `file_size_limit`/`allowed_mime_types` (5 Mo,
images pour `avatars` ; 10 Mo, images + PDF pour `documents`) — cohérent
avec les seuls usages réels de ces buckets côté app.

### 5. XSS stocké via `href` non validé (code applicatif, pas de migration)

`paiement.captureUrl` et `litige.preuveUrls[i]` sont des champs texte libres
insérés par des fonctions client-callable (`declarerPaiement`, `creerLitige`)
sans validation serveur du format, puis rendus tels quels en `href` dans le
back-office admin. Un payload `javascript:...` aurait pu s'exécuter dans la
session admin au clic. Ajout de `estUrlHttpSure()`
(`packages/shared/src/format/index.ts`) qui n'autorise que les schémas
`http:`/`https:` (après avoir neutralisé les tab/CR/LF, ignorés par les
navigateurs dans l'évaluation du schéma) ; les deux pages admin concernées
filtrent désormais les URLs avant de les rendre.

### 6. Injection dans le filtre `.or()` PostgREST (code applicatif)

`getCommunications` construisait son filtre de recherche par interpolation
directe de `params.recherche` dans une chaîne `.or(...)`. La grammaire de
filtre PostgREST utilise `,` et `()` comme caractères de contrôle — pas une
injection SQL (PostgREST paramètre toujours les valeurs), mais une recherche
malicieusement construite pouvait manipuler la structure du filtre voulu.
Ces caractères sont désormais retirés de `recherche` avant interpolation.

### 7. Back-office admin accessible à tout compte authentifié

`apps/admin/middleware.ts` ne vérifiait que la présence d'une session, jamais
le type de compte : n'importe quel client ou coursier connecté avec ses
propres identifiants mobiles pouvait charger l'intégralité de l'UI admin
(RLS continuait de protéger les données sous-jacentes, mais l'exposition de
l'interface elle-même était un vrai problème). Le middleware lit désormais
`utilisateurs.type` pour la session en cours ; toute session non-admin est
déconnectée et redirigée vers `/login?erreur=acces_refuse`, avec un message
affiché sur la page de connexion.

## Délibérément non corrigé dans cette passe

- **`notifications_insert_authenticated` / `historique_coursier_insert_authenticated`**
  ouvertes à tout authentifié : permettent en théorie l'insertion de fausses
  entrées d'audit/notification. Risque jugé plus faible (pas d'élévation de
  privilège, pas de fuite de données — au pire du bruit visible par l'admin
  seul) ; à resserrer dans une passe ultérieure si le besoin se confirme.
- **OTP (`packages/shared/src/otp`)** : pas de limitation de tentatives ni de
  fréquence d'envoi. Non exploitable aujourd'hui car ce module n'est appelé
  nulle part dans le flux d'authentification actuel (code prêt mais inactif)
  — à traiter avant sa mise en service effective, pas avant.
- **Réattribution/acceptation de course après suspension d'un coursier déjà
  référencé** : lacune déjà identifiée et documentée comme différée dans
  `docs/COURSIERS_STATUTS_BADGES.md` (risque disproportionné pour un gain
  résiduel théorique).

## Migrations à appliquer

Dans l'ordre, dans le SQL Editor Supabase :
1. `supabase/migrations/0028_securite_verrouillage_colonnes.sql`
2. `supabase/migrations/0029_securite_badges_notations_storage.sql`

## Vérification effectuée

- `pnpm --filter @colimo/shared typecheck`, `--filter @colimo/admin typecheck`,
  `--filter @colimo/mobile typecheck` : OK
- `pnpm --filter @colimo/admin build`, `pnpm --filter @colimo/mobile build:web` : OK
- Les deux migrations n'ont pas pu être exécutées contre une base réelle
  (pas d'accès réseau depuis cet environnement) — à valider par l'utilisateur
  après collage dans le SQL Editor, notamment le scénario "toggle disponible"
  côté mobile (le trigger `coursiers_verrouiller_colonnes_privilegiees`
  dépend de l'ordre d'exécution alphabétique avec `coursiers_sync_statut`).
