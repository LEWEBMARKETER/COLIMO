-- Ajoute PK12 à la liste des zones couvertes (cf. FAQ officialisée).
-- Statement isolé : Postgres interdit d'utiliser une nouvelle valeur d'enum
-- dans la même transaction que celle qui l'a créée.

alter type zone add value 'pk12';
