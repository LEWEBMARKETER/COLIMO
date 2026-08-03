-- Refonte de l'interface de prise de commande : catégories de colis
-- élargies, taille, "qui paie", contacts nommés à l'enlèvement et à la
-- livraison, repères, instructions libres.

alter type categorie_colis add value if not exists 'vetement';
alter type categorie_colis add value if not exists 'medicament';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'taille_colis') then
    create type taille_colis as enum ('petit', 'moyen', 'grand');
  end if;
  if not exists (select 1 from pg_type where typname = 'qui_paie') then
    create type qui_paie as enum ('expediteur', 'destinataire');
  end if;
end $$;

alter table courses
  add column if not exists nom_destinataire text,
  add column if not exists nom_expediteur text,
  add column if not exists telephone_expediteur text,
  add column if not exists repere_depart text,
  add column if not exists repere_arrivee text,
  add column if not exists taille_colis taille_colis,
  add column if not exists qui_paie qui_paie not null default 'expediteur',
  add column if not exists instructions text;
