# Gestion des identifiants admin & invitations multi-administrateurs

## Audit préalable

Avant cette fonctionnalité :
- **Aucun self-service** pour qu'un admin change son propre email/mot de
  passe — seul un accès direct au dashboard Supabase le permettait. Le
  mécanisme existait déjà côté app mobile (`(auth)/forgot-password.tsx` +
  `(auth)/reset-password.tsx`, basé sur `resetPasswordForEmail`/`updateUser`
  standard de Supabase Auth), simplement jamais répliqué côté admin.
- **Aucun système d'invitation d'administrateurs.** La création d'un compte
  `type='admin'` est explicitement bloquée via l'inscription standard
  (trigger `proteger_insertion_utilisateurs`, 0028) — y compris pour une
  session déjà admin, ce trigger ne vérifiant que `auth.uid() is not null`,
  pas le rôle de l'appelant. Le seul module "équipe" existant
  (`commerce_membres`, 0032) concerne les sous-comptes d'un **commerce**
  (plan Business COLIMO PRO), sans rapport avec les administrateurs de la
  plateforme. Jusqu'ici, ajouter un admin nécessitait une intervention
  manuelle dans Supabase (SQL Editor).

## Ce qui a été ajouté

### 1. "Mon compte" (`/mon-compte`)
Page self-service pour tout admin connecté :
- **Changer d'email** : nécessite le mot de passe actuel (ré-authentification
  via `signInWithPassword` avant tout changement sensible), puis
  `supabase.auth.updateUser({ email })` — Supabase envoie un email de
  confirmation à la nouvelle adresse, le changement ne prend effet qu'après
  confirmation.
- **Changer de mot de passe** : même ré-authentification obligatoire, puis
  `updateUser({ password })`, avec les mêmes règles de validation que le
  reste de l'app (`validerMotDePasse`, déjà utilisé côté mobile).

### 2. Invitation d'administrateurs (`/administrateurs`)
- Formulaire (Nom, Email, Téléphone) → route serveur
  `api/administrateurs/route.ts` (clé service-role, seule habilitée à créer
  un compte Supabase Auth pour un tiers) : appelle
  `auth.admin.inviteUserByEmail` (email avec lien d'invitation), puis
  insère la ligne `utilisateurs` correspondante (`type='admin'`) dans la
  même requête privilégiée — contourne légitimement le blocage
  d'auto-promotion, puisque c'est la route serveur elle-même qui écrit,
  pas une session cliente. Si l'insertion échoue (téléphone déjà utilisé),
  le compte Auth orphelin créé est automatiquement supprimé (`deleteUser`).
- Page `/invitation` (publique, exemptée du garde d'authentification
  normal) : atterrissage du lien reçu par email, définition du mot de
  passe — même schéma que `reset-password.tsx` côté mobile.
- Liste des administrateurs existants, avec qui les a invités et quand
  (`historique_invitations_admin`, nouvelle table d'audit, écrite
  uniquement par la route serveur — même schéma que
  `historique_suppressions_compte`, 0036).
- **Révoquer/réactiver l'accès** : aucune route dédiée nécessaire — le
  trigger de verrouillage de colonnes (0028) exempte déjà entièrement toute
  session admin pour `utilisateurs.statut`, donc un simple
  `updateUtilisateur(id, { statut: 'suspendu' })` depuis le client suffit,
  réutilisant exactement le mécanisme déjà en place pour suspendre un
  client. Un admin suspendu est bloqué à la connexion par le middleware
  (étendu pour vérifier aussi `statut`, pas seulement `type`). Auto-révocation
  impossible (bouton masqué sur sa propre ligne).

## Sécurité

- Créer un nouvel admin reste **impossible** sans la clé service-role (donc
  sans passer par la route serveur, elle-même vérifiant que l'appelant est
  déjà admin) — cohérent avec le blocage existant.
- Changer son propre email/mot de passe exige de reconnaître le mot de
  passe actuel — empêche qu'une session laissée ouverte sur un poste
  partagé permette une prise de contrôle du compte.
- Un admin suspendu est immédiatement bloqué à la prochaine requête
  (middleware, vérifié à chaque navigation).

## Ce qui n'a pas été touché

Authentification des comptes client/coursier, COLIMO PRO,
`commerce_membres` (équipe commerce) : inchangés. Aucune donnée existante
supprimée.

## Fichiers modifiés/ajoutés

**Nouveaux** :
- `supabase/migrations/0045_invitations_administrateurs.sql`
- `packages/shared/src/administrateurs/`
- `apps/admin/app/api/administrateurs/route.ts`
- `apps/admin/app/(dashboard)/administrateurs/page.tsx`
- `apps/admin/app/(dashboard)/mon-compte/page.tsx`
- `apps/admin/app/invitation/page.tsx`

**Modifiés** :
- `packages/shared/src/index.ts`, `src/supabase/mappers.ts`
- `apps/admin/lib/api.ts`, `apps/admin/middleware.ts`, `apps/admin/components/Sidebar.tsx`

## Migration à appliquer

`supabase/migrations/0045_invitations_administrateurs.sql` (SQL Editor Supabase, après 0044).

## Tests manuels

- [ ] "Mon compte" : changer le mot de passe avec le bon mot de passe actuel → succès ; avec un mauvais → erreur claire.
- [ ] "Mon compte" : changer l'email → email de confirmation reçu sur la nouvelle adresse.
- [ ] "Administrateurs" : inviter un nouvel admin → email d'invitation reçu.
- [ ] Cliquer le lien d'invitation → atterrit sur `/invitation`, définit un mot de passe → accède au back-office.
- [ ] Vérifier que le nouvel admin apparaît dans la liste, avec "Invité par" correctement renseigné.
- [ ] Suspendre l'accès d'un admin (pas soi-même) → il ne peut plus se connecter (déconnecté au prochain chargement).
- [ ] Réactiver → peut se reconnecter normalement.
- [ ] Vérifier qu'on ne peut pas suspendre son propre compte (bouton absent sur sa propre ligne).
- [ ] `pnpm --filter @colimo/{shared,admin,mobile} typecheck` et `next build` (les deux passent).
