-- Système de paliers et commissions coursiers (3/4) : moteur de calcul.
-- Appelée depuis confirmer_reception_client, valider_livraison_admin et
-- finaliser_livraisons_en_attente (0056) — les 3 seuls chemins qui amènent
-- une course à statut='confirmee' (0042, 0051). Regroupe en un seul point
-- la logique financière plutôt que de la dupliquer dans les 3 fonctions,
-- tout en gardant ces 3 fonctions comme seul déclencheur (pas de trigger
-- générique AFTER UPDATE sur courses, pour rester dans le style de ce
-- repo : chaque RPC assume explicitement ses effets de bord).
--
-- Règle du "palier au moment de la course" (besoin section 4) : le taux
-- appliqué à une course est celui du palier déterminé par le compteur du
-- mois AVANT cette course — la course qui fait franchir un palier est
-- encore facturée à l'ancien taux, seules les suivantes profitent du
-- nouveau. Rien n'est jamais recalculé rétroactivement.

create or replace function calculer_et_enregistrer_commission_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_coursier_id uuid; -- coursiers.id (PK) — pas courses.coursier_id (utilisateurs.id)
  v_date_confirmation date;
  v_mois date;
  v_taux numeric(5, 4);
  v_montant_commission numeric;
  v_montant_net numeric;
  v_ancien_palier catalogue_paliers_commission;
  v_nouveau_palier catalogue_paliers_commission;
  v_courses_eligibles_avant int;
  v_courses_eligibles_apres int;
  v_date_effet_grille date;
begin
  -- Idempotence (besoin section 10) : garde-fou en plus de unique(course_id)
  -- sur commissions_courses, pour sortir tôt sans lever d'exception en cas
  -- de double appel (ex. confirmer_reception_client appelé deux fois).
  if exists (select 1 from commissions_courses where course_id = p_course_id) then
    return;
  end if;

  select * into v_course from courses where id = p_course_id;
  if not found or v_course.coursier_id is null then
    return;
  end if;

  select id into v_coursier_id from coursiers where utilisateur_id = v_course.coursier_id;
  if v_coursier_id is null then
    return;
  end if;

  v_date_confirmation := coalesce(v_course.confirmee_at, now())::date;

  if v_date_confirmation < '2026-10-01' then
    -- Régime historique (besoin section 14) : taux fixe 15%, identique à
    -- l'ancienne colonne générée (0017). Aucun impact sur
    -- performance_mensuelle_coursier — le système de paliers ne démarre
    -- qu'au 2026-10-01 ; palier_id reste null pour distinguer une ligne
    -- "legacy" d'une ligne réellement calculée par palier.
    v_taux := 0.15;
    v_montant_commission := round(v_course.prix * v_taux);
    v_montant_net := v_course.prix - v_montant_commission;

    insert into commissions_courses
      (course_id, coursier_id, montant_brut, taux_commission, montant_commission, montant_net_coursier, palier_id)
    values
      (p_course_id, v_coursier_id, v_course.prix, v_taux, v_montant_commission, v_montant_net, null);

    perform set_config('colimo.systeme_interne', 'true', true);
    update courses set commission = v_montant_commission where id = p_course_id;
    return;
  end if;

  v_mois := date_trunc('month', v_date_confirmation)::date;

  -- Grille applicable : la plus récente dont la date d'effet est déjà
  -- passée — un changement de grille programmé pour plus tard ne s'applique
  -- jamais par anticipation (besoin section 9).
  select date_effet into v_date_effet_grille
  from catalogue_paliers_commission
  where date_effet <= v_date_confirmation and actif
  order by date_effet desc
  limit 1;

  if v_date_effet_grille is null then
    -- Configuration incomplète (aucune grille active) : on abandonne le
    -- calcul plutôt que d'inventer un taux — la confirmation de la course
    -- elle-même n'est jamais bloquée par ce module.
    return;
  end if;

  insert into performance_mensuelle_coursier (coursier_id, mois)
  values (v_coursier_id, v_mois)
  on conflict (coursier_id, mois) do nothing;

  -- Verrouille la ligne du mois pour la durée de la transaction : deux
  -- courses confirmées à quelques millisecondes d'écart pour le même
  -- coursier ne doivent jamais lire le même compteur "avant" (besoin
  -- section 11 : calcul critique strictement côté serveur).
  select courses_eligibles into v_courses_eligibles_avant
  from performance_mensuelle_coursier
  where coursier_id = v_coursier_id and mois = v_mois
  for update;

  select * into v_ancien_palier
  from catalogue_paliers_commission
  where date_effet = v_date_effet_grille
    and v_courses_eligibles_avant >= seuil_min
    and (seuil_max is null or v_courses_eligibles_avant <= seuil_max)
  order by ordre desc
  limit 1;

  if v_ancien_palier is null then
    return;
  end if;

  v_taux := v_ancien_palier.taux;
  v_montant_commission := round(v_course.prix * v_taux);
  v_montant_net := v_course.prix - v_montant_commission;

  insert into commissions_courses
    (course_id, coursier_id, montant_brut, taux_commission, montant_commission, montant_net_coursier, palier_id)
  values
    (p_course_id, v_coursier_id, v_course.prix, v_taux, v_montant_commission, v_montant_net, v_ancien_palier.id);

  perform set_config('colimo.systeme_interne', 'true', true);
  update courses set commission = v_montant_commission where id = p_course_id;

  v_courses_eligibles_apres := v_courses_eligibles_avant + 1;

  select * into v_nouveau_palier
  from catalogue_paliers_commission
  where date_effet = v_date_effet_grille
    and v_courses_eligibles_apres >= seuil_min
    and (seuil_max is null or v_courses_eligibles_apres <= seuil_max)
  order by ordre desc
  limit 1;

  update performance_mensuelle_coursier
  set
    courses_eligibles = v_courses_eligibles_apres,
    chiffre_affaires_brut = chiffre_affaires_brut + v_course.prix,
    commission_colimo_total = commission_colimo_total + v_montant_commission,
    revenus_net_coursier = revenus_net_coursier + v_montant_net,
    palier_id = coalesce(v_nouveau_palier.id, v_ancien_palier.id),
    taux_commission_actuel = coalesce(v_nouveau_palier.taux, v_ancien_palier.taux)
  where coursier_id = v_coursier_id and mois = v_mois;

  -- Franchissement détecté : historise (table dédiée + historique_coursier
  -- générique, besoin section 3) et pose une notification en attente
  -- (besoin section 7) — jamais de recalcul des courses déjà enregistrées.
  if v_nouveau_palier.id is distinct from v_ancien_palier.id and v_nouveau_palier.id is not null then
    insert into historique_palier_coursier (coursier_id, mois, palier_id)
    values (v_coursier_id, v_mois, v_nouveau_palier.id);

    insert into historique_coursier (coursier_id, action, ancienne_valeur, nouvelle_valeur)
    values (v_coursier_id, 'changement_palier_commission', v_ancien_palier.code, v_nouveau_palier.code);

    insert into notifications_palier_en_attente (coursier_id, palier_id)
    values (v_coursier_id, v_nouveau_palier.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Consommation de la boîte aux lettres — appelée par les wrappers TS de
-- confirmer_reception_client et valider_livraison_admin juste après l'appel
-- RPC existant (le coursier qui vient de franchir un palier n'est jamais le
-- même compte que celui qui appelle ces deux RPC — client ou admin — d'où
-- un paramètre explicite plutôt que auth.uid()). Les codes/noms de palier
-- et leur taux ne sont pas des informations sensibles individuellement
-- (même lecture ouverte que catalogue_niveaux, 0025).
-- ---------------------------------------------------------------------------

create or replace function recuperer_et_marquer_notification_palier(p_coursier_utilisateur_id uuid)
returns table (palier_code text, palier_nom text, taux numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coursier_id uuid;
  v_palier_id uuid;
begin
  select id into v_coursier_id from coursiers where utilisateur_id = p_coursier_utilisateur_id;
  if v_coursier_id is null then
    return;
  end if;

  select palier_id into v_palier_id
  from notifications_palier_en_attente
  where coursier_id = v_coursier_id and traite_at is null
  order by cree_at desc
  limit 1;

  if v_palier_id is null then
    return;
  end if;

  update notifications_palier_en_attente
  set traite_at = now()
  where coursier_id = v_coursier_id and traite_at is null;

  return query
  select p.code, p.nom, p.taux from catalogue_paliers_commission p where p.id = v_palier_id;
end;
$$;

grant execute on function recuperer_et_marquer_notification_palier(uuid) to authenticated;

-- Variante pour la tâche planifiée finaliser_livraisons_en_attente (0042,
-- 0056) : elle ne connaît pas à l'avance les coursiers concernés, donc pas
-- de paramètre — vide toute la boîte aux lettres en une fois.
create or replace function recuperer_toutes_notifications_palier_en_attente()
returns table (coursier_utilisateur_id uuid, palier_code text, palier_nom text, taux numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coursier_id uuid;
begin
  for v_coursier_id in
    select distinct n.coursier_id from notifications_palier_en_attente n where n.traite_at is null
  loop
    coursier_utilisateur_id := (select c.utilisateur_id from coursiers c where c.id = v_coursier_id);

    select p.code, p.nom, p.taux
    into palier_code, palier_nom, taux
    from notifications_palier_en_attente n
    join catalogue_paliers_commission p on p.id = n.palier_id
    where n.coursier_id = v_coursier_id and n.traite_at is null
    order by n.cree_at desc
    limit 1;

    update notifications_palier_en_attente
    set traite_at = now()
    where coursier_id = v_coursier_id and traite_at is null;

    return next;
  end loop;
end;
$$;

grant execute on function recuperer_toutes_notifications_palier_en_attente() to service_role;
