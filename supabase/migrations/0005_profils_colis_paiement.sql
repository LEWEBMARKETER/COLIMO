-- Enrichit les profils (prénom, photo, particulier/commerce), la pièce
-- d'identité coursier (typée + upload réel), et la commande (catégorie de
-- colis, numéro unique, mode de paiement).

-- --------------------------------------------------------------------------
-- utilisateurs
-- --------------------------------------------------------------------------

alter table utilisateurs
  add column prenom text,
  add column photo_url text,
  add column type_client text check (type_client in ('particulier', 'commerce')) default 'particulier';

-- --------------------------------------------------------------------------
-- coursiers : pièce d'identité typée + upload réel (remplace la simulation)
-- --------------------------------------------------------------------------

create type piece_identite_type as enum ('cni', 'passeport', 'carte_sejour', 'permis_conduire');

alter table coursiers
  add column type_piece_identite piece_identite_type,
  add column piece_identite_url text;

-- --------------------------------------------------------------------------
-- courses : catégorie de colis, mode de paiement, numéro de commande
-- --------------------------------------------------------------------------

create type categorie_colis as enum (
  'repas', 'courses_alimentaires', 'documents', 'articles', 'electromenager', 'autres'
);

create type mode_paiement as enum ('mobile_money', 'especes');

alter table courses
  add column categorie_colis categorie_colis not null default 'autres',
  add column mode_paiement mode_paiement not null default 'especes';

create sequence if not exists courses_numero_seq;

alter table courses add column numero_commande text;

update courses
set numero_commande = 'CLM-' || lpad(nextval('courses_numero_seq')::text, 6, '0')
where numero_commande is null;

alter table courses
  alter column numero_commande set default ('CLM-' || lpad(nextval('courses_numero_seq')::text, 6, '0')),
  alter column numero_commande set not null,
  add constraint courses_numero_commande_unique unique (numero_commande);
