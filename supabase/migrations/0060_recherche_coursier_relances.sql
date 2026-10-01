-- Recherche d'un coursier — délai d'attente (4/4) : relances coursiers
-- (besoin section 13). Pas de cron Vercel dédié — le seul cron existant
-- (apps/mobile/vercel.json) tourne une fois par jour (contrainte du plan
-- actuel), incompatible avec une granularité de 5/10 minutes. La
-- vérification "faut-il relancer ?" est donc exposée comme une RPC,
-- appelée en piggyback sur le poll déjà existant de track/[id].tsx
-- (apps/mobile, throttlé côté client) — architecture prête pour un vrai
-- cron si le plan Vercel change un jour : il suffirait d'appeler cette
-- même RPC depuis un endpoint planifié, aucune logique à réécrire.
--
-- La sélection des coursiers à notifier n'est volontairement PAS
-- dupliquée ici : cette RPC se contente de déterminer QUAND relancer et
-- de poser une garde anti-doublon ; le choix des destinataires reste
-- `getCoursiersEligiblesCourse`/`selectionnerMeilleursCoursiers` + l'appel
-- à `notifierMeilleursCoursiers` déjà utilisés à la création de la course
-- (apps/mobile/lib/communication.ts) — le TS appelant ré-exécute
-- simplement cette même fonction quand cette RPC signale qu'un intervalle
-- vient d'être franchi.

create table if not exists relances_recherche_coursier (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  intervalle_minutes int not null,
  envoyee_at timestamptz not null default now(),
  unique (course_id, intervalle_minutes)
);

create index if not exists relances_recherche_coursier_course_idx
  on relances_recherche_coursier (course_id);

alter table relances_recherche_coursier enable row level security;

-- Table de garde interne (analytics admin, besoin section 18) — le client
-- voit déjà la notification elle-même, pas cette ligne de garde.
drop policy if exists "relances_recherche_coursier_select_admin" on relances_recherche_coursier;
create policy "relances_recherche_coursier_select_admin"
  on relances_recherche_coursier for select
  using (current_user_type() = 'admin');

-- Aucune policy insert/update : écriture exclusivement via la RPC ci-dessous.

create or replace function marquer_relances_recherche_dues(p_course_id uuid)
returns int[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_config configuration_recherche_coursier;
  v_intervalle int;
  v_dus int[] := '{}';
begin
  select * into v_course from courses where id = p_course_id;
  if not found or v_course.client_id != auth.uid() then
    return v_dus;
  end if;

  -- Plus rien à relancer dès qu'un coursier est attribué ou que la course
  -- a quitté la recherche (annulée, etc.) — jamais de relance tardive hors
  -- propos (CAS C).
  if v_course.coursier_id is not null or v_course.statut != 'en_attente' then
    return v_dus;
  end if;

  select * into v_config from configuration_recherche_coursier where id = 1;

  foreach v_intervalle in array coalesce(v_config.intervalles_relance_minutes, '{5,10}') loop
    if now() >= v_course.created_at + (v_intervalle || ' minutes')::interval then
      insert into relances_recherche_coursier (course_id, intervalle_minutes)
      values (p_course_id, v_intervalle)
      on conflict (course_id, intervalle_minutes) do nothing;

      if found then
        v_dus := array_append(v_dus, v_intervalle);
      end if;
    end if;
  end loop;

  return v_dus;
end;
$$;

grant execute on function marquer_relances_recherche_dues(uuid) to authenticated;
