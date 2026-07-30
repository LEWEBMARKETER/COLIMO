-- Statut supplémentaire pour une course dont le colis n'a pas pu être
-- livré et a dû être retourné (typiquement à l'issue d'un litige).
alter type course_status add value if not exists 'retournee';

-- Montant effectivement facturé au client lors d'un retour de colis
-- (politique : 50% du prix de la course, voir calculerFraisRetour côté
-- packages/shared). Null tant qu'aucun retour n'a eu lieu.
alter table courses
  add column if not exists frais_retour numeric;
