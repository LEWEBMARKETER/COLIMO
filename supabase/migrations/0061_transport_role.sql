-- COLIMO TRANSPORT (1/4) : nouveau rôle 'transporteur'. Statement isolé :
-- Postgres interdit d'utiliser une nouvelle valeur d'enum dans la même
-- transaction que celle qui l'a créée (même contrainte que 0004_zone_pk12).
-- Purement additif : aucune ligne existante, aucune policy existante
-- n'est modifiée par cet ajout — current_user_type() continue de
-- fonctionner tel quel pour 'client'/'coursier'/'admin'.

alter type user_type add value 'transporteur';
