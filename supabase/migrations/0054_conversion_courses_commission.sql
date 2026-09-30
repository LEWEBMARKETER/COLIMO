-- Système de paliers et commissions coursiers (2/4) : conversion de
-- courses.commission, colonne générée figée à 15% (0017), en colonne
-- classique — seule façon de lui faire porter un taux variable par palier.
-- DROP EXPRESSION conserve telles quelles toutes les valeurs déjà calculées
-- (comportement documenté de Postgres) : aucune course existante n'est
-- recalculée ni retouchée (besoin sections 4, 10 et 14).
alter table courses alter column commission drop expression;

-- Sans colonne générée, Postgres n'empêche plus une écriture directe de
-- commission par un PATCH non-admin — la protection qu'offrait la colonne
-- générée doit donc être reprise explicitement par
-- proteger_colonnes_privilegiees_courses (0028, étendue en 0030/0038),
-- exactement comme prix/reduction_promo/frais_retour le sont déjà. Seule
-- différence : un bypass "colimo.systeme_interne" est ajouté (même
-- mécanisme que proteger_transition_livree_courses, 0042) pour permettre à
-- calculer_et_enregistrer_commission_course (0055) d'écrire commission
-- depuis une session cliente/coursier non-admin (confirmer_reception_client,
-- verifier_otp_livraison) — aucune des colonnes déjà protégées ci-dessous
-- n'est jamais écrite sous ce flag aujourd'hui, donc ce bypass n'élargit
-- leur protection existante d'aucune façon.
create or replace function proteger_colonnes_privilegiees_courses()
returns trigger
language plpgsql
as $$
begin
  if current_setting('colimo.systeme_interne', true) = 'true' then
    return new;
  end if;
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.prix is distinct from old.prix then
    new.prix := old.prix;
  end if;
  if new.reduction_promo is distinct from old.reduction_promo then
    new.reduction_promo := old.reduction_promo;
  end if;
  if new.frais_retour is distinct from old.frais_retour then
    new.frais_retour := old.frais_retour;
  end if;
  if new.commission is distinct from old.commission then
    new.commission := old.commission;
  end if;

  if new.coursier_id is distinct from old.coursier_id then
    if not (old.coursier_id is null and new.coursier_id = auth.uid()) then
      new.coursier_id := old.coursier_id;
    end if;
  end if;

  if new.distance_restante_m is distinct from old.distance_restante_m then
    new.distance_restante_m := old.distance_restante_m;
  end if;
  if new.eta_secondes is distinct from old.eta_secondes then
    new.eta_secondes := old.eta_secondes;
  end if;
  if new.eta_calcule_at is distinct from old.eta_calcule_at then
    new.eta_calcule_at := old.eta_calcule_at;
  end if;
  if new.eta_calcule_lat is distinct from old.eta_calcule_lat then
    new.eta_calcule_lat := old.eta_calcule_lat;
  end if;
  if new.eta_calcule_lng is distinct from old.eta_calcule_lng then
    new.eta_calcule_lng := old.eta_calcule_lng;
  end if;
  if new.eta_source is distinct from old.eta_source then
    new.eta_source := old.eta_source;
  end if;

  return new;
end;
$$;
