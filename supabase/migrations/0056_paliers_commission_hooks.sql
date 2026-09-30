-- Système de paliers et commissions coursiers (4/4) : branchement sur les
-- 3 chemins existants qui amènent une course à statut='confirmee' (0042,
-- 0051) et notifications de franchissement (besoin section 7). Aucune
-- autre ligne de confirmer_reception_client / valider_livraison_admin /
-- finaliser_livraisons_en_attente n'est modifiée — un seul appel ajouté à
-- calculer_et_enregistrer_commission_course (0055) dans chacune.

alter type action_historique_coursier add value if not exists 'changement_palier_commission';

-- ---------------------------------------------------------------------------
-- confirmer_reception_client (0042) — ajoute l'appel juste après le passage
-- à "confirmee" côté client.
-- ---------------------------------------------------------------------------

create or replace function confirmer_reception_client(p_course_id uuid, p_signaler boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from courses where id = p_course_id and client_id = auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  if not exists (select 1 from confirmations_livraison where course_id = p_course_id and coursier_confirme_at is not null) then
    raise exception 'Le coursier n''a pas encore confirmé la remise du colis';
  end if;

  if p_signaler then
    update confirmations_livraison
    set client_confirmation_statut = 'signale'
    where course_id = p_course_id and client_confirmation_statut = 'en_attente';

    insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
    values (p_course_id, 'client_signale', auth.uid());
    return;
  end if;

  update confirmations_livraison
  set client_confirmation_statut = 'confirme', client_confirme_at = now(), finalise_at = now()
  where course_id = p_course_id and client_confirmation_statut = 'en_attente';

  perform set_config('colimo.systeme_interne', 'true', true);
  update courses set statut = 'confirmee' where id = p_course_id;

  insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
  values (p_course_id, 'client_confirme', auth.uid()), (p_course_id, 'livraison_finalisee', auth.uid());

  perform calculer_et_enregistrer_commission_course(p_course_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- valider_livraison_admin (0051) — ajoute l'appel juste après le passage à
-- "confirmee" côté admin (branche p_resultat = 'confirmee' uniquement).
-- ---------------------------------------------------------------------------

create or replace function valider_livraison_admin(
  p_course_id uuid,
  p_methode text,
  p_resultat text,
  p_note text default null
)
returns courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_ancien_statut course_status;
  v_nouveau_statut course_status;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  if p_methode not in ('client_contacte', 'coursier_contacte', 'client_et_coursier_contactes', 'preuve_verifiee', 'autre') then
    raise exception 'Méthode de vérification invalide.';
  end if;
  if p_resultat not in ('confirmee', 'contestee', 'impossible') then
    raise exception 'Résultat de vérification invalide.';
  end if;

  if (p_resultat != 'confirmee' or p_methode = 'autre') and coalesce(trim(p_note), '') = '' then
    raise exception 'Une note administrative est obligatoire pour ce choix.';
  end if;

  select * into v_course from courses where id = p_course_id;
  if not found then
    raise exception 'Course introuvable.';
  end if;
  if v_course.statut != 'livree' then
    raise exception 'Cette course n''est pas en attente de confirmation.';
  end if;

  v_ancien_statut := v_course.statut;
  perform set_config('colimo.systeme_interne', 'true', true);

  if p_resultat = 'confirmee' then
    v_nouveau_statut := 'confirmee';

    update courses set statut = 'confirmee' where id = p_course_id returning * into v_course;

    update confirmations_livraison
    set client_confirmation_statut = 'confirme', client_confirme_at = now(), finalise_at = now()
    where course_id = p_course_id and client_confirmation_statut = 'en_attente';

    insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id, details)
    values (p_course_id, 'livraison_finalisee', auth.uid(), jsonb_build_object('source', 'admin'));

    perform calculer_et_enregistrer_commission_course(p_course_id);

  elsif p_resultat = 'contestee' then
    v_nouveau_statut := 'litige';

    update courses set statut = 'litige' where id = p_course_id returning * into v_course;

    insert into litiges (course_id, auteur_id, motif, commentaire)
    values (p_course_id, auth.uid(), 'autre', 'Vérification administrative — livraison contestée. ' || p_note);

  else
    v_nouveau_statut := v_course.statut;
  end if;

  insert into historique_validation_admin_livraison
    (course_id, ancien_statut, nouveau_statut, administrateur_id, methode_verification, resultat, note)
  values
    (p_course_id, v_ancien_statut, v_nouveau_statut, auth.uid(), p_methode::methode_verification_livraison, p_resultat::resultat_verification_livraison, nullif(trim(p_note), ''));

  return v_course;
end;
$$;

-- ---------------------------------------------------------------------------
-- finaliser_livraisons_en_attente (0042, cron) — capture les courses
-- effectivement finalisées pour leur appliquer le calcul de commission,
-- sans changer sa signature ni son comportement de retour (nombre de
-- courses finalisées, inchangé).
-- ---------------------------------------------------------------------------

create or replace function finaliser_livraisons_en_attente()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delai int;
  v_count int;
  v_course_ids uuid[];
  v_course_id uuid;
begin
  select delai_auto_finalisation_minutes into v_delai from configuration_confirmation_livraison where id = 1;

  perform set_config('colimo.systeme_interne', 'true', true);

  with a_finaliser as (
    update confirmations_livraison cl
    set client_confirmation_statut = 'auto_finalise', finalise_at = now()
    where cl.coursier_confirme_at is not null
      and cl.client_confirmation_statut = 'en_attente'
      and cl.coursier_confirme_at + (v_delai || ' minutes')::interval <= now()
    returning cl.course_id
  ),
  maj_courses as (
    update courses c set statut = 'confirmee'
    from a_finaliser
    where c.id = a_finaliser.course_id and c.statut = 'livree'
    returning c.id
  )
  select array_agg(id) into v_course_ids from maj_courses;

  insert into historique_confirmation_livraison (course_id, evenement)
  select unnest(v_course_ids), 'auto_finalisee';

  if v_course_ids is not null then
    foreach v_course_id in array v_course_ids loop
      perform calculer_et_enregistrer_commission_course(v_course_id);
    end loop;
  end if;

  v_count := coalesce(array_length(v_course_ids, 1), 0);
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Modèles de notification (besoin section 7) — texte exact de la mission,
-- canal push in-app (même pattern que abonnement_active, 0034).
-- ---------------------------------------------------------------------------

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('coursier_palier_actif', 'push', 'Passage au palier Actif (in-app)',
   E'🎉 Félicitations ! Vous passez au statut ACTIF. Votre commission COLIMO est désormais de {{taux}}.',
   array['taux']),
  ('coursier_palier_pro', 'push', 'Passage au palier Pro (in-app)',
   E'🚀 Vous êtes maintenant PRO. Votre commission passe à {{taux}}.',
   array['taux']),
  ('coursier_palier_elite', 'push', 'Passage au palier Elite (in-app)',
   E'🏆 Statut ELITE atteint ! Vous bénéficiez désormais du taux COLIMO de {{taux}}.',
   array['taux'])
on conflict (code) do nothing;
