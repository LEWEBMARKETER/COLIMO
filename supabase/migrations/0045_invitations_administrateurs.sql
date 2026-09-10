-- Invitation de plusieurs administrateurs par l'administrateur principal.
--
-- Audit préalable (cf. session) : la création d'un compte type='admin' est
-- déjà explicitement bloquée via l'inscription standard côté client
-- (trigger proteger_insertion_utilisateurs, 0028) — volontaire, pour
-- empêcher qu'un compte s'auto-promeuve admin. Ce blocage s'applique même à
-- une session déjà admin (le trigger ne vérifie que auth.uid() is not null,
-- pas current_user_type()) : la création d'un nouvel admin doit donc
-- obligatoirement passer par une route serveur avec la clé service-role
-- (apps/admin/app/api/administrateurs/route.ts, qui appelle
-- auth.admin.inviteUserByEmail puis insère la ligne utilisateurs
-- correspondante dans la même requête service-role).
--
-- La gestion d'un admin déjà existant (suspendre/réactiver son accès) n'a
-- en revanche besoin d'aucune route dédiée : le trigger de verrouillage de
-- colonnes (0028) exempte déjà entièrement toute session admin pour
-- utilisateurs.statut — un simple patchUtilisateur() depuis le client admin
-- suffit, réutilisant exactement le même mécanisme que la suspension d'un
-- client (apps/admin/app/(dashboard)/clients/page.tsx).
--
-- Cette migration ajoute uniquement l'historique d'audit des invitations
-- (qui a invité qui, quand) — même schéma que historique_suppressions_compte
-- (0036) : écrit uniquement par la route serveur (service-role), jamais par
-- un client authentifié classique.

create table historique_invitations_admin (
  id uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references utilisateurs(id) on delete cascade,
  nom text not null,
  email text not null,
  invite_par uuid not null references utilisateurs(id),
  created_at timestamptz not null default now()
);

create index historique_invitations_admin_utilisateur_idx
  on historique_invitations_admin (utilisateur_id);

alter table historique_invitations_admin enable row level security;

create policy "historique_invitations_admin_select_admin"
  on historique_invitations_admin for select
  using (current_user_type() = 'admin');
