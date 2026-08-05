-- Module Coursiers (1/3) : statut opérationnel canonique + statistiques
-- dénormalisées. Corrige au passage deux bugs préexistants : note_moyenne
-- n'était jamais recalculée, et "nombre de livraisons" n'existait nulle
-- part en base (recalculé côté client à chaque écran).
--
-- coursiers.statut devient LE champ canonique du statut opérationnel.
-- Volontairement 6 valeurs stockées seulement : "occupé" n'est jamais
-- persisté, c'est un état dérivé (le coursier a une course active) —
-- calculé côté application, cf. packages/shared/src/coursiers/statuts.
-- Ne pas ajouter 'occupe' à cet enum : ce serait redondant avec l'état
-- des courses et introduirait un risque de désynchronisation.
--
-- utilisateurs.statut n'est plus utilisé pour les coursiers à partir de
-- cette migration (il reste inchangé pour clients/commerçants). Le
-- backfill ci-dessous le LIT une seule fois pour préserver les coursiers
-- déjà suspendus, mais n'y écrit jamais.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'statut_coursier') then
    create type statut_coursier as enum (
      'en_attente_validation',
      'verifie',
      'en_ligne',
      'hors_ligne',
      'suspendu',
      'desactive'
    );
  end if;
end $$;

alter table coursiers
  add column if not exists statut statut_coursier not null default 'en_attente_validation',
  add column if not exists nombre_livraisons integer not null default 0,
  add column if not exists nombre_courses_assignees integer not null default 0,
  add column if not exists nombre_courses_annulees integer not null default 0,
  add column if not exists duree_livraison_totale_secondes bigint not null default 0;

update coursiers c set statut = (case
  when u.statut = 'suspendu' then 'suspendu'
  when c.statut_verification = 'valide' and c.disponibilite then 'en_ligne'
  when c.statut_verification = 'valide' then 'hors_ligne'
  else 'en_attente_validation'
end)::statut_coursier
from utilisateurs u
where u.id = c.utilisateur_id and c.statut = 'en_attente_validation';

-- Synchronisation bidirectionnelle statut_verification / statut / disponibilite.
-- Écriture même-ligne uniquement (BEFORE UPDATE) : pas besoin de security
-- definer ici, l'appelant a déjà passé coursiers_update_own_or_admin pour
-- arriver jusqu'à ce trigger.
create or replace function sync_statut_coursier()
returns trigger
language plpgsql
as $$
begin
  if new.statut_verification is distinct from old.statut_verification
     and new.statut_verification = 'valide'
     and old.statut = 'en_attente_validation' then
    new.statut := 'verifie'::statut_coursier;
  end if;

  if new.statut is distinct from old.statut then
    case new.statut
      when 'suspendu', 'desactive', 'hors_ligne' then new.disponibilite := false;
      when 'en_ligne' then new.disponibilite := true;
      else null;
    end case;
  elsif new.disponibilite is distinct from old.disponibilite
        and old.statut in ('verifie', 'en_ligne', 'hors_ligne') then
    new.statut := (case when new.disponibilite then 'en_ligne' else 'hors_ligne' end)::statut_coursier;
  end if;

  return new;
end;
$$;

drop trigger if exists coursiers_sync_statut on coursiers;
create trigger coursiers_sync_statut
  before update on coursiers
  for each row execute function sync_statut_coursier();

-- Compteurs dérivés des courses. security definer car cette écriture
-- traverse coursiers depuis un update sur courses potentiellement déclenché
-- par le CLIENT (ex. confirmation de réception) — ni le coursier ni un
-- admin, donc coursiers_update_own_or_admin bloquerait silencieusement
-- sans cela. Même schéma que current_user_type()/coursier_couvre_zone().
--
-- S'exécute après courses_set_status_timestamps (migration 0018, elle
-- aussi BEFORE UPDATE) dans la même transaction, donc new.acceptee_at /
-- new.livree_at sont déjà renseignés quand ce trigger les lit.
create or replace function maj_statistiques_coursier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coursier_id is null then
    return new;
  end if;

  if old.coursier_id is null and new.coursier_id is not null then
    update coursiers set nombre_courses_assignees = nombre_courses_assignees + 1
    where utilisateur_id = new.coursier_id;
  end if;

  if new.statut is distinct from old.statut then
    if new.statut = 'confirmee' then
      update coursiers
      set nombre_livraisons = nombre_livraisons + 1,
          duree_livraison_totale_secondes = duree_livraison_totale_secondes
            + coalesce(extract(epoch from (new.livree_at - new.acceptee_at))::bigint, 0)
      where utilisateur_id = new.coursier_id;
    elsif new.statut = 'annulee' then
      update coursiers set nombre_courses_annulees = nombre_courses_annulees + 1
      where utilisateur_id = new.coursier_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists courses_maj_statistiques_coursier on courses;
create trigger courses_maj_statistiques_coursier
  after update on courses
  for each row execute function maj_statistiques_coursier();

-- note_moyenne était en place depuis la migration initiale mais jamais
-- recalculée : les notes s'inséraient dans `notations` sans jamais
-- remonter. security definer pour la même raison que ci-dessus
-- (notations_insert_auteur autorise n'importe quel auteur, souvent un
-- client, à insérer une note pour un coursier).
create or replace function maj_note_moyenne_coursier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update coursiers
  set note_moyenne = coalesce((
    select round(avg(note)::numeric, 1) from notations where destinataire_id = new.destinataire_id
  ), 0)
  where utilisateur_id = new.destinataire_id;
  return new;
end;
$$;

drop trigger if exists notations_maj_note_moyenne on notations;
create trigger notations_maj_note_moyenne
  after insert on notations
  for each row execute function maj_note_moyenne_coursier();
