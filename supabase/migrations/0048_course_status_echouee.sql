-- Statut "livraison échouée" — le coursier n'a pas pu remettre le colis
-- (client absent, adresse incorrecte...). Distinct de "litige" (désaccord
-- nécessitant un arbitrage COLIMO) et de "annulee" (arrêt avant retrait).
-- Statement isolé requis par Postgres pour ALTER TYPE ... ADD VALUE (même
-- raison que 0010/0014/0021 : une valeur ajoutée ne peut pas être utilisée
-- dans la même transaction que celle qui l'ajoute).
alter type course_status add value if not exists 'echouee';
