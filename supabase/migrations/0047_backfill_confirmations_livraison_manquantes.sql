-- Comble les lignes confirmations_livraison manquantes pour les courses
-- créées AVANT l'application de 0042 (confirmation de livraison OTP +
-- photo). Le trigger courses_creer_confirmation_livraison (0042) ne
-- provisionne une ligne qu'à la création d'une NOUVELLE course — toute
-- course déjà en cours à ce moment-là n'en a jamais eu.
--
-- Conséquence concrète (constatée en capture d'écran) : le client d'une
-- telle course ne voit jamais son code de réception (getConfirmationLivraison
-- renvoie null, la carte ne s'affiche pas) ET le coursier ne peut PLUS DU
-- TOUT finaliser la livraison — verifier_otp_livraison échoue
-- immédiatement ("Confirmation de livraison introuvable") faute de ligne à
-- lire. Une course ancienne encore active (en_attente/acceptee/retrait/
-- en_cours) reste donc bloquée indéfiniment sans ce correctif.
--
-- Volontairement limité à ces 4 statuts pré-livraison : une course déjà
-- "livree" à ce stade proviendrait de l'ancien mécanisme (avant 0042, sans
-- passage par verifier_otp_livraison) — lui backfiller une ligne sans
-- coursier_confirme_at casserait la confirmation client (qui exige
-- justement cette colonne). Ce cas plus rare, s'il existe, doit être traité
-- au cas par cas plutôt que par un backfill générique.
with nouvelles_confirmations as (
  insert into confirmations_livraison (course_id, code_otp, otp_expire_at)
  select
    c.id,
    generer_otp_livraison(coalesce(cfg.otp_longueur, 4)),
    now() + (coalesce(cfg.otp_validite_minutes, 1440) || ' minutes')::interval
  from courses c
  cross join configuration_confirmation_livraison cfg
  where cfg.id = 1
    and c.statut in ('en_attente', 'acceptee', 'retrait', 'en_cours')
    and not exists (select 1 from confirmations_livraison cl where cl.course_id = c.id)
  returning course_id
)
insert into historique_confirmation_livraison (course_id, evenement)
select course_id, 'otp_genere' from nouvelles_confirmations;
