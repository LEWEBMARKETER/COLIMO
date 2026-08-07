-- Module Abonnements commerçants — 2/4 : équipe (Pack Business, jusqu'à 3
-- sous-comptes par code d'invitation auto-inscrit). L'architecture actuelle
-- (apps Next.js/Expo qui parlent directement à Supabase via RLS, sans
-- backend custom ni Edge Functions) ne permet pas de créer un compte
-- Supabase Auth au nom d'un tiers sans clé service-role côté serveur —
-- l'inscription reste donc self-service, rattachée au commerce via un code
-- d'invitation à usage unique.

create table if not exists commerce_membres (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  utilisateur_id uuid not null unique references utilisateurs (id),
  role text not null default 'employe' check (role in ('administrateur', 'responsable', 'employe')),
  invite_par uuid references utilisateurs (id),
  created_at timestamptz not null default now()
);

create index if not exists commerce_membres_commerce_idx on commerce_membres (commerce_id);

alter table commerce_membres enable row level security;

drop policy if exists "commerce_membres_select_own_or_admin" on commerce_membres;
create policy "commerce_membres_select_own_or_admin"
  on commerce_membres for select
  using (
    current_user_type() = 'admin'
    or utilisateur_id = auth.uid()
    or commerce_id in (select id from commercants where utilisateur_id = auth.uid())
  );

-- Aucune policy insert directe : uniquement via creer_membre_proprietaire_commerce
-- (automatique) et rejoindre_commerce (RPC ci-dessous).

-- Le propriétaire principal du commerce (commercants.utilisateur_id) est
-- automatiquement inscrit comme membre 'administrateur' à la création de
-- sa fiche commerce, pour que toute résolution d'appartenance passe par
-- cette seule table (pas de cas particulier "propriétaire vs membre").
create or replace function creer_membre_proprietaire_commerce()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into commerce_membres (commerce_id, utilisateur_id, role)
  values (new.id, new.utilisateur_id, 'administrateur')
  on conflict (utilisateur_id) do nothing;
  return new;
end;
$$;

drop trigger if exists commercants_creer_membre_proprietaire on commercants;
create trigger commercants_creer_membre_proprietaire
  after insert on commercants
  for each row execute function creer_membre_proprietaire_commerce();

-- Backfill : les commerces déjà existants n'ont pas encore leur ligne
-- commerce_membres.
insert into commerce_membres (commerce_id, utilisateur_id, role)
select id, utilisateur_id, 'administrateur' from commercants
on conflict (utilisateur_id) do nothing;

create table if not exists invitations_commerce (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commercants (id) on delete cascade,
  code text not null unique,
  role text not null default 'employe' check (role in ('administrateur', 'responsable', 'employe')),
  cree_par uuid not null references utilisateurs (id),
  utilise_par uuid references utilisateurs (id),
  expire_le timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table invitations_commerce enable row level security;

drop policy if exists "invitations_commerce_select_own_or_admin" on invitations_commerce;
create policy "invitations_commerce_select_own_or_admin"
  on invitations_commerce for select
  using (
    current_user_type() = 'admin'
    or commerce_id in (select id from commercants where utilisateur_id = auth.uid())
  );

-- Pas de policy insert directe : uniquement via creer_invitation_commerce
-- (vérifie le palier Business et la limite de 3 avant de générer le code).

-- =====================================================================
-- Helpers de résolution d'abonnement — security definer, réutilisés par
-- toutes les policies/triggers de gating des fonctionnalités premium.
-- =====================================================================

create or replace function commerce_id_pour_utilisateur(p_utilisateur_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select commerce_id from commerce_membres where utilisateur_id = p_utilisateur_id limit 1;
$$;

-- Dérive le palier RÉELLEMENT applicable (jamais stocké tel quel) : un
-- abonnement expiré ou suspendu retombe automatiquement au niveau gratuit,
-- sans qu'aucune tâche planifiée ne soit nécessaire (le projet n'a pas
-- d'infrastructure cron/Edge Function) — même principe que le statut
-- "occupé" dérivé des coursiers (jamais stocké en base).
create or replace function plan_effectif_commerce(p_commerce_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.abonnement_suspendu then 'gratuit'
    when c.subscription_plan = 'gratuit' then 'gratuit'
    when c.abonnement_expire_le is null then 'gratuit'
    when c.abonnement_expire_le > now() then c.subscription_plan
    else 'gratuit'
  end
  from commercants c where c.id = p_commerce_id;
$$;

-- =====================================================================
-- RPC creer_invitation_commerce / rejoindre_commerce
-- =====================================================================

-- Réservé au propriétaire principal (pas aux sous-comptes même
-- 'administrateur') — limite volontaire de la V1 pour ne pas avoir à
-- gérer de cascade de délégation de droits.
create or replace function creer_invitation_commerce(p_role text default 'employe')
returns invitations_commerce
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce_id uuid;
  v_nb_membres integer;
  v_nb_invitations_actives integer;
  v_code text;
  v_resultat invitations_commerce;
begin
  select id into v_commerce_id from commercants where utilisateur_id = auth.uid();
  if v_commerce_id is null then
    raise exception 'Seul le propriétaire principal du commerce peut inviter un utilisateur.';
  end if;

  if plan_effectif_commerce(v_commerce_id) != 'business' then
    raise exception 'La gestion des utilisateurs est réservée au Pack Business.';
  end if;

  select count(*) into v_nb_membres from commerce_membres
  where commerce_id = v_commerce_id and role != 'administrateur';
  select count(*) into v_nb_invitations_actives from invitations_commerce
  where commerce_id = v_commerce_id and utilise_par is null and expire_le > now();

  if v_nb_membres + v_nb_invitations_actives >= 3 then
    raise exception 'Limite de 3 utilisateurs supplémentaires atteinte pour le Pack Business.';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into invitations_commerce (commerce_id, code, role, cree_par)
  values (v_commerce_id, v_code, p_role, auth.uid())
  returning * into v_resultat;

  return v_resultat;
end;
$$;

create or replace function rejoindre_commerce(p_code text)
returns commerce_membres
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation invitations_commerce;
  v_nb_membres integer;
  v_resultat commerce_membres;
begin
  select * into v_invitation from invitations_commerce
  where code = p_code and utilise_par is null and expire_le > now();

  if not found then
    raise exception 'Code d''invitation invalide ou expiré.';
  end if;

  if exists (select 1 from commerce_membres where utilisateur_id = auth.uid()) then
    raise exception 'Ce compte appartient déjà à un commerce.';
  end if;

  select count(*) into v_nb_membres from commerce_membres
  where commerce_id = v_invitation.commerce_id and role != 'administrateur';
  if v_nb_membres >= 3 then
    raise exception 'Limite de 3 utilisateurs supplémentaires atteinte pour ce commerce.';
  end if;

  insert into commerce_membres (commerce_id, utilisateur_id, role, invite_par)
  values (v_invitation.commerce_id, auth.uid(), v_invitation.role, v_invitation.cree_par)
  returning * into v_resultat;

  update invitations_commerce set utilise_par = auth.uid() where id = v_invitation.id;

  return v_resultat;
end;
$$;
