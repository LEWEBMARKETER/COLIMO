-- Système de pôles pour les administrateurs (Super Admin / Opérations /
-- Support & Commerces / Finance & Analytics) + workflow d'invitation à 3
-- statuts + journal d'audit des actions d'administration.
--
-- Audit préalable : jusqu'ici tous les comptes type='admin' étaient
-- strictement équivalents (accès complet, cf. current_user_type() = 'admin'
-- utilisé comme exemption globale dans de nombreuses policies/triggers,
-- notamment 0028). Cette migration N'ENLÈVE RIEN à ce comportement pour les
-- tables métier existantes (courses, paiements, coursiers, etc.) — la
-- segmentation par pôle pour CES tables reste appliquée côté application
-- (middleware + routes serveur, cf. apps/admin), pas en RLS, pour ne pas
-- réécrire l'ensemble des policies existantes. En revanche, la table
-- utilisateurs elle-même (qui décide QUI est admin et avec quel pôle) est
-- désormais protégée en base : seul un Super Admin confirmé peut changer le
-- pôle ou le statut d'invitation d'un autre compte — sans cette protection,
-- n'importe quel admin (même Opérations ou Support) aurait pu s'auto-
-- promouvoir super_admin via un appel direct à l'API REST Supabase, en
-- contournant complètement l'interface et les routes serveur.

create type pole_administrateur as enum ('super_admin', 'operations', 'support_commerces', 'finance_analytics');

create type statut_invitation_admin as enum ('en_cours', 'confirme', 'refuse');

alter table utilisateurs
  add column pole_admin pole_administrateur,
  add column statut_invitation statut_invitation_admin not null default 'confirme';

-- Les administrateurs déjà existants (créés avant ce système) conservent un
-- accès complet équivalent à celui qu'ils avaient déjà — ils deviennent
-- Super Admin. statut_invitation reste à sa valeur par défaut 'confirme'
-- (compte déjà actif de longue date).
update utilisateurs set pole_admin = 'super_admin' where type = 'admin' and pole_admin is null;

-- Helper RLS : pôle de l'administrateur courant (analogue à current_user_type()).
create function current_pole_admin()
returns pole_administrateur
language sql
stable
security definer
set search_path = public
as $$
  select pole_admin from utilisateurs where id = auth.uid();
$$;

create or replace function proteger_pole_et_invitation_admin()
returns trigger
language plpgsql
as $$
begin
  -- Appel service-role (provisioning, routes serveur déjà vérifiées côté
  -- application) : jamais bloqué.
  if auth.uid() is null then
    return new;
  end if;

  -- Seule transition libre pour le titulaire de la ligne lui-même :
  -- confirmer sa propre invitation (en_cours -> confirme), déclenché par
  -- /invitation juste après la définition du mot de passe. Le pôle ne doit
  -- pas changer dans cette même écriture.
  if auth.uid() = new.id
     and old.statut_invitation = 'en_cours'
     and new.statut_invitation = 'confirme'
     and new.pole_admin is not distinct from old.pole_admin then
    return new;
  end if;

  -- Toute autre modification du pôle ou du statut d'invitation est réservée
  -- à un Super Admin confirmé. Les routes serveur (apps/admin/app/api/
  -- administrateurs/**) vérifient déjà ce rôle avant d'écrire ; ce trigger
  -- est le garde-fou base de données contre un appel direct qui
  -- contournerait l'interface.
  if new.pole_admin is distinct from old.pole_admin or new.statut_invitation is distinct from old.statut_invitation then
    if current_pole_admin() is distinct from 'super_admin' or current_user_type() is distinct from 'admin' then
      raise exception 'Modification du pôle ou du statut d''invitation réservée au Super Admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists utilisateurs_proteger_pole_invitation on utilisateurs;
create trigger utilisateurs_proteger_pole_invitation
  before update on utilisateurs
  for each row execute function proteger_pole_et_invitation_admin();

-- Journal d'audit des actions d'administration (invitation, changement de
-- rôle, suspension/réactivation, annulation d'invitation, etc.). Écrit
-- uniquement par les routes serveur (service-role) ; lecture réservée au
-- Super Admin.
create table historique_actions_admin (
  id uuid primary key default gen_random_uuid(),
  administrateur_id uuid not null references utilisateurs(id),
  action text not null,
  cible_id uuid references utilisateurs(id),
  details jsonb,
  resultat text not null default 'succes' check (resultat in ('succes', 'echec')),
  created_at timestamptz not null default now()
);

create index historique_actions_admin_administrateur_idx on historique_actions_admin (administrateur_id);
create index historique_actions_admin_cible_idx on historique_actions_admin (cible_id);

alter table historique_actions_admin enable row level security;

create policy "historique_actions_admin_select_super_admin"
  on historique_actions_admin for select
  using (current_pole_admin() = 'super_admin');
