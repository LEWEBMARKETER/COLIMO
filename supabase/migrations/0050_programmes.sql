-- Module générique « Programmes » — infrastructure réutilisable pour toute
-- campagne d'inscription (commerçants, coursiers ou particuliers), pas
-- seulement le premier programme (100 Commerces Partenaires). Une seule
-- paire de tables (programs / program_participants) sert tous les
-- programmes à venir — aucune table spécifique à une campagne.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'program_target_type') then
    create type program_target_type as enum ('merchant', 'courier', 'customer', 'all');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type program_status as enum ('draft', 'active', 'closed', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_participant_status') then
    create type program_participant_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Table : programs
-- ---------------------------------------------------------------------------

create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  target_type program_target_type not null default 'all',
  -- Contenu configurable (jamais codé en dur côté UI) : tableau de chaînes,
  -- ex. '["Inscription gratuite", "Accompagnement personnalisé"]'.
  benefits jsonb not null default '[]'::jsonb,
  max_participants integer check (max_participants is null or max_participants > 0),
  start_date timestamptz,
  end_date timestamptz,
  status program_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists programs_set_updated_at on programs;
create trigger programs_set_updated_at
  before update on programs
  for each row execute function set_updated_at();

create index if not exists programs_status_idx on programs (status);
create index if not exists programs_target_type_idx on programs (target_type);

-- ---------------------------------------------------------------------------
-- Table : program_participants
-- ---------------------------------------------------------------------------

create table if not exists program_participants (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs (id) on delete cascade,
  user_id uuid not null references utilisateurs (id) on delete cascade,
  status program_participant_status not null default 'pending',
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references utilisateurs (id),
  unique (program_id, user_id)
);

create index if not exists program_participants_program_idx on program_participants (program_id, status);
create index if not exists program_participants_user_idx on program_participants (user_id);

-- ---------------------------------------------------------------------------
-- Éligibilité — fait le lien entre le target_type générique d'un programme
-- et les types de compte réels de la plateforme (user_type + type_client).
-- Centralisé ici pour que RLS et RPC partagent la même règle.
-- ---------------------------------------------------------------------------

create or replace function utilisateur_est_eligible_programme(p_target_type program_target_type)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_target_type
    when 'all' then true
    when 'courier' then (select type from utilisateurs where id = auth.uid()) = 'coursier'
    when 'merchant' then (select type = 'client' and type_client = 'commerce' from utilisateurs where id = auth.uid())
    when 'customer' then (select type = 'client' and (type_client is null or type_client = 'particulier') from utilisateurs where id = auth.uid())
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table programs enable row level security;
alter table program_participants enable row level security;

-- programs : l'admin voit tout (y compris les brouillons/archivés) ; un
-- utilisateur ne voit que les programmes publiés (actif/clos — un programme
-- clos reste visible pour que les membres déjà acceptés le retrouvent) et
-- auxquels il est éligible.
drop policy if exists "programs_select_admin_or_eligible" on programs;
create policy "programs_select_admin_or_eligible"
  on programs for select
  using (
    current_user_type() = 'admin'
    or (status in ('active', 'closed') and utilisateur_est_eligible_programme(target_type))
  );

drop policy if exists "programs_insert_admin" on programs;
create policy "programs_insert_admin" on programs for insert with check (current_user_type() = 'admin');
drop policy if exists "programs_update_admin" on programs;
create policy "programs_update_admin" on programs for update using (current_user_type() = 'admin') with check (current_user_type() = 'admin');
drop policy if exists "programs_delete_admin" on programs;
create policy "programs_delete_admin" on programs for delete using (current_user_type() = 'admin');

-- program_participants : l'admin voit tout ; un utilisateur ne voit que ses
-- propres candidatures. Écriture exclusivement via les RPC ci-dessous (pas
-- de policy insert/update pour les non-admins).
drop policy if exists "program_participants_select_own_or_admin" on program_participants;
create policy "program_participants_select_own_or_admin"
  on program_participants for select
  using (user_id = auth.uid() or current_user_type() = 'admin');

-- =====================================================================
-- RPC candidater_programme — dépose la candidature de l'appelant.
-- =====================================================================

create or replace function candidater_programme(p_program_id uuid)
returns program_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_programme programs;
  v_resultat program_participants;
  v_acceptes integer;
begin
  select * into v_programme from programs where id = p_program_id;
  if not found then
    raise exception 'Programme introuvable.';
  end if;
  if v_programme.status != 'active' then
    raise exception 'Ce programme n''accepte plus de candidatures.';
  end if;
  if not utilisateur_est_eligible_programme(v_programme.target_type) then
    raise exception 'Vous n''êtes pas éligible à ce programme.';
  end if;

  if v_programme.max_participants is not null then
    select count(*) into v_acceptes from program_participants
      where program_id = p_program_id and status = 'approved';
    if v_acceptes >= v_programme.max_participants then
      raise exception 'Programme complet.';
    end if;
  end if;

  insert into program_participants (program_id, user_id)
  values (p_program_id, auth.uid())
  on conflict (program_id, user_id) do nothing
  returning * into v_resultat;

  if v_resultat.id is null then
    raise exception 'Vous avez déjà candidaté à ce programme.';
  end if;

  return v_resultat;
end;
$$;

grant execute on function candidater_programme(uuid) to authenticated;

-- =====================================================================
-- RPC traiter_candidature_programme — admin uniquement, accepte ou refuse.
-- =====================================================================

create or replace function traiter_candidature_programme(p_participant_id uuid, p_decision text)
returns program_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant program_participants;
  v_programme programs;
  v_acceptes integer;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Décision invalide.';
  end if;

  select * into v_participant from program_participants where id = p_participant_id;
  if not found then
    raise exception 'Candidature introuvable.';
  end if;
  if v_participant.status != 'pending' then
    raise exception 'Cette candidature a déjà été traitée.';
  end if;

  if p_decision = 'approved' then
    select * into v_programme from programs where id = v_participant.program_id;
    if v_programme.max_participants is not null then
      select count(*) into v_acceptes from program_participants
        where program_id = v_participant.program_id and status = 'approved' and id != p_participant_id;
      if v_acceptes >= v_programme.max_participants then
        raise exception 'Programme complet, aucune place disponible.';
      end if;
    end if;
  end if;

  update program_participants
  set status = p_decision::program_participant_status, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_participant_id
  returning * into v_participant;

  return v_participant;
end;
$$;

grant execute on function traiter_candidature_programme(uuid, text) to authenticated;

-- =====================================================================
-- RPC compteur_participants_programme — décompte agrégé (places restantes),
-- sans exposer la liste des candidatures : la RLS de program_participants
-- ne laisse un non-admin lire que ses propres candidatures, donc un simple
-- select/count() ne suffirait pas à afficher "X places restantes" côté
-- commerce. security definer pour traverser cette restriction, mais ne
-- renvoie qu'un décompte — jamais les lignes elles-mêmes.
-- =====================================================================

create or replace function compteur_participants_programme(p_program_id uuid)
returns table (participants_acceptes integer, places_restantes integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where pp.status = 'approved')::integer as participants_acceptes,
    case when p.max_participants is null then null
         else greatest(p.max_participants - count(*) filter (where pp.status = 'approved'), 0)::integer
    end as places_restantes
  from programs p
  left join program_participants pp on pp.program_id = p.id
  where p.id = p_program_id
  group by p.id, p.max_participants;
$$;

grant execute on function compteur_participants_programme(uuid) to authenticated;

-- =====================================================================
-- Modèles de notification (Communication Center existant — aucun système
-- de notification spécifique créé ici).
-- =====================================================================

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('notification_programme_candidature_recue', 'push', 'Candidature à un programme reçue (in-app)',
   E'Votre candidature pour « {{nom_programme}} » a bien été reçue. Nous l''examinons.',
   array['nom_programme']),
  ('notification_programme_candidature_acceptee', 'push', 'Candidature à un programme acceptée (in-app)',
   E'Bonne nouvelle : votre candidature pour « {{nom_programme}} » a été acceptée !',
   array['nom_programme']),
  ('notification_programme_candidature_refusee', 'push', 'Candidature à un programme refusée (in-app)',
   E'Votre candidature pour « {{nom_programme}} » n''a pas été retenue cette fois-ci.',
   array['nom_programme'])
on conflict (code) do nothing;

-- =====================================================================
-- Programme initial : 100 Commerces Partenaires COLIMO
-- =====================================================================

insert into programs (name, slug, description, target_type, benefits, max_participants, status)
values (
  '100 Commerces Partenaires COLIMO',
  '100-commerces-partenaires',
  'Rejoignez les premiers commerces partenaires qui participent au développement du réseau COLIMO.',
  'merchant',
  '["Inscription gratuite", "Accompagnement personnalisé", "Accès au réseau COLIMO PARTNERS", "Avantages COLIMO PRO", "Visibilité auprès de la communauté COLIMO", "Offres et avantages réservés aux partenaires"]'::jsonb,
  100,
  'active'
)
on conflict (slug) do nothing;
