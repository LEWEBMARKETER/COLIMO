-- Enrichit la fiche commerçant (secteur d'activité, volume de livraisons
-- quotidien, WhatsApp, photo du commerce) et le formulaire de nouvelle
-- livraison commerçant (destinataire par téléphone/quartier plutôt que
-- compte client, poids estimé, livraison programmée, paiement déjà réglé
-- au commerce).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activite_commerce') then
    create type activite_commerce as enum (
      'restaurant', 'pharmacie', 'boutique', 'ecommerce', 'fleuriste', 'patisserie', 'librairie', 'autre'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'volume_livraisons') then
    create type volume_livraisons as enum ('un_a_cinq', 'cinq_a_dix', 'dix_a_vingt', 'plus_de_vingt');
  end if;
end $$;

alter table commercants
  add column if not exists activite activite_commerce,
  add column if not exists volume_quotidien volume_livraisons,
  add column if not exists whatsapp text,
  add column if not exists photo_commerce_url text;

alter table courses
  add column if not exists telephone_destinataire text,
  add column if not exists poids_estime numeric,
  add column if not exists programmee_pour timestamptz;

alter type mode_paiement add value if not exists 'deja_paye';

-- Les colonnes acceptee_at/recuperee_at/livree_at/confirmee_at/annulee_at
-- existent depuis la migration initiale mais n'ont jamais été renseignées :
-- rien ne les mettait à jour. Nécessaires pour calculer un vrai délai moyen
-- de livraison et taux de réussite (tableau de bord commerçant).
create or replace function set_course_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.statut is distinct from old.statut then
    case new.statut
      when 'acceptee' then new.acceptee_at := coalesce(new.acceptee_at, now());
      when 'retrait' then new.recuperee_at := coalesce(new.recuperee_at, now());
      when 'livree' then new.livree_at := coalesce(new.livree_at, now());
      when 'confirmee' then new.confirmee_at := coalesce(new.confirmee_at, now());
      when 'annulee' then new.annulee_at := coalesce(new.annulee_at, now());
      else null;
    end case;
  end if;
  return new;
end;
$$;

drop trigger if exists courses_set_status_timestamps on courses;
create trigger courses_set_status_timestamps
  before update on courses
  for each row execute function set_course_status_timestamps();
