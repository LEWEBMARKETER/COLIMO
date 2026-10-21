-- COLIMO TRANSPORT — simplification de l'inscription (1/3) : nouvelle
-- valeur d'action d'audit pour distinguer "demander une correction" de
-- "rejeter le dossier" dans historique_transporteur, alors que les deux
-- aboutissent au même statut visible NON_CONFIRME côté admin (3 statuts
-- visibles uniquement : EN_ATTENTE/CONFIRME/NON_CONFIRME — mappés en
-- affichage sur l'enum verification_status existant, jamais renommé :
-- cet enum est partagé avec coursiers, le renommer casserait ce module).
-- Statement isolé : Postgres interdit d'utiliser une nouvelle valeur
-- d'enum dans la même transaction que celle qui l'a créée.

alter type action_historique_transporteur add value 'demande_correction';
