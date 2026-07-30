-- Statut intermédiaire "En cours de retrait" entre l'acceptation par le
-- coursier et le début de la livraison (départ vers l'adresse d'arrivée).
-- Statement isolé requis par Postgres pour ALTER TYPE ... ADD VALUE.
alter type course_status add value 'retrait';
