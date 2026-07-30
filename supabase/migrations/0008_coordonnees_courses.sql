-- Coordonnées GPS optionnelles pour les courses : permettent d'ouvrir le
-- départ/l'arrivée dans Google Maps depuis l'app. Nullable car une course
-- peut être publiée sans que le client autorise la géolocalisation.
alter table courses
  add column if not exists latitude_depart double precision,
  add column if not exists longitude_depart double precision,
  add column if not exists latitude_arrivee double precision,
  add column if not exists longitude_arrivee double precision;
