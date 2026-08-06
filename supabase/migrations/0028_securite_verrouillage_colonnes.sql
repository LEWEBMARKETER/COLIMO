-- Audit de sécurité : plusieurs policies RLS "own row" (utilisateurs,
-- coursiers, paiements, courses) ne restreignent que la LIGNE accessible,
-- jamais les COLONNES modifiables — Postgres RLS ne fait pas de contrôle
-- par colonne nativement. Un utilisateur authentifié pouvait donc, via un
-- appel direct à l'API REST Supabase avec sa propre session (en
-- contournant l'app), écrire n'importe quelle colonne de sa propre ligne,
-- y compris des colonnes qui ne devraient être modifiables que par un
-- admin ou par la logique système :
--
--   - utilisateurs.type      -> auto-promotion en admin
--   - utilisateurs.statut    -> auto-réactivation après suspension
--   - coursiers.statut_verification / statut / note_moyenne / niveau_id /
--     compteurs de livraisons -> auto-validation KYC, fausse note, faux niveau
--   - paiements.statut / valide_par / valide_at -> auto-confirmation de paiement
--   - courses.prix / reduction_promo / frais_retour / coursier_id ->
--     manipulation du prix après création, vol d'assignation coursier
--
-- Cette migration ajoute des triggers BEFORE UPDATE qui reviennent
-- silencieusement à l'ancienne valeur (plutôt que de faire échouer toute
-- la requête) pour toute colonne privilégiée modifiée par une session non
-- admin, sauf pour la ou les transitions légitimes explicitement décrites
-- dans chaque section. Un appel sans session (SQL Editor / provisioning
-- direct, auth.uid() est alors null) n'est jamais bloqué.

-- =====================================================================
-- utilisateurs : type et statut réservés à l'admin
-- =====================================================================

create or replace function proteger_colonnes_privilegiees_utilisateurs()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and current_user_type() is distinct from 'admin' then
    if new.type is distinct from old.type then
      raise exception 'Modification du type de compte réservée aux administrateurs';
    end if;
    if new.statut is distinct from old.statut then
      raise exception 'Modification du statut de compte réservée aux administrateurs';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists utilisateurs_proteger_colonnes on utilisateurs;
create trigger utilisateurs_proteger_colonnes
  before update on utilisateurs
  for each row execute function proteger_colonnes_privilegiees_utilisateurs();

-- Empêche aussi la création directe d'un compte type='admin' via
-- l'inscription standard (utilisateurs_insert_own ne vérifie que id = auth.uid()).
create or replace function proteger_insertion_utilisateurs()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.type = 'admin' then
    raise exception 'Création d''un compte administrateur impossible via l''inscription standard';
  end if;
  return new;
end;
$$;

drop trigger if exists utilisateurs_proteger_insertion on utilisateurs;
create trigger utilisateurs_proteger_insertion
  before insert on utilisateurs
  for each row execute function proteger_insertion_utilisateurs();

-- =====================================================================
-- coursiers : colonnes de confiance (KYC, note, niveau, compteurs)
-- =====================================================================
-- Les triggers système existants (maj_statistiques_coursier,
-- maj_note_moyenne_coursier, définis en 0023) et le RPC
-- definir_niveau_coursier (0025) doivent continuer à écrire ces colonnes
-- même quand l'acteur déclencheur n'est pas admin (ex. un client qui
-- confirme une livraison recalcule les stats DU COURSIER, pas les
-- siennes). Ils s'identifient via un indicateur transaction-locale
-- (colimo.systeme_interne), sans effet au-delà de l'appel REST/RPC en
-- cours puisque chaque appel PostgREST est sa propre transaction.

create or replace function maj_statistiques_coursier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  if new.coursier_id is null then
    return new;
  end if;

  if old.coursier_id is null and new.coursier_id is not null then
    update coursiers set nombre_courses_assignees = nombre_courses_assignees + 1
    where utilisateur_id = new.coursier_id;
  end if;

  if new.statut is distinct from old.statut then
    if new.statut = 'confirmee' then
      update coursiers
      set nombre_livraisons = nombre_livraisons + 1,
          duree_livraison_totale_secondes = duree_livraison_totale_secondes
            + coalesce(extract(epoch from (new.livree_at - new.acceptee_at))::bigint, 0)
      where utilisateur_id = new.coursier_id;
    elsif new.statut = 'annulee' then
      update coursiers set nombre_courses_annulees = nombre_courses_annulees + 1
      where utilisateur_id = new.coursier_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function maj_note_moyenne_coursier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  update coursiers
  set note_moyenne = coalesce((
    select round(avg(note)::numeric, 1) from notations where destinataire_id = new.destinataire_id
  ), 0)
  where utilisateur_id = new.destinataire_id;
  return new;
end;
$$;

create or replace function definir_niveau_coursier(
  p_coursier_id uuid,
  p_niveau_id uuid,
  p_administrateur_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ancien_niveau text;
  v_nouveau_niveau text;
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  select n.nom into v_ancien_niveau
  from coursiers c left join catalogue_niveaux n on n.id = c.niveau_id
  where c.id = p_coursier_id;

  select nom into v_nouveau_niveau from catalogue_niveaux where id = p_niveau_id;

  if v_ancien_niveau is distinct from v_nouveau_niveau then
    update coursiers set niveau_id = p_niveau_id where id = p_coursier_id;
    insert into historique_coursier (coursier_id, action, ancienne_valeur, nouvelle_valeur, administrateur_id)
    values (p_coursier_id, 'changement_niveau', v_ancien_niveau, v_nouveau_niveau, p_administrateur_id);
  end if;
end;
$$;

create or replace function proteger_colonnes_privilegiees_coursiers()
returns trigger
language plpgsql
as $$
declare
  statut_attendu statut_coursier;
begin
  if current_setting('colimo.systeme_interne', true) = 'true' then
    return new;
  end if;

  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  if new.statut_verification is distinct from old.statut_verification then
    new.statut_verification := old.statut_verification;
  end if;

  -- Seule transition légitime pour une session non-admin : celle dérivée
  -- du toggle "disponible" côté mobile, déjà appliquée par
  -- coursiers_sync_statut (qui s'exécute avant ce trigger, ordre
  -- alphabétique "s" < "v"). Toute autre tentative de changement direct
  -- de statut est annulée.
  if new.statut is distinct from old.statut then
    statut_attendu := case
      when new.disponibilite is distinct from old.disponibilite
           and old.statut in ('verifie', 'en_ligne', 'hors_ligne')
        then (case when new.disponibilite then 'en_ligne' else 'hors_ligne' end)::statut_coursier
      else old.statut
    end;
    if new.statut is distinct from statut_attendu then
      new.statut := old.statut;
    end if;
  end if;

  if new.note_moyenne is distinct from old.note_moyenne then
    new.note_moyenne := old.note_moyenne;
  end if;
  if new.nombre_livraisons is distinct from old.nombre_livraisons then
    new.nombre_livraisons := old.nombre_livraisons;
  end if;
  if new.nombre_courses_assignees is distinct from old.nombre_courses_assignees then
    new.nombre_courses_assignees := old.nombre_courses_assignees;
  end if;
  if new.nombre_courses_annulees is distinct from old.nombre_courses_annulees then
    new.nombre_courses_annulees := old.nombre_courses_annulees;
  end if;
  if new.duree_livraison_totale_secondes is distinct from old.duree_livraison_totale_secondes then
    new.duree_livraison_totale_secondes := old.duree_livraison_totale_secondes;
  end if;
  if new.niveau_id is distinct from old.niveau_id then
    new.niveau_id := old.niveau_id;
  end if;

  return new;
end;
$$;

-- Nom choisi pour trier après "coursiers_sync_statut" (ordre alphabétique
-- des triggers BEFORE UPDATE sur une même table/événement) : ce trigger
-- doit voir le statut déjà synchronisé par sync_statut_coursier.
drop trigger if exists coursiers_verrouiller_colonnes_privilegiees on coursiers;
create trigger coursiers_verrouiller_colonnes_privilegiees
  before update on coursiers
  for each row execute function proteger_colonnes_privilegiees_coursiers();

-- =====================================================================
-- paiements : statut et validation réservés à l'admin
-- =====================================================================

create or replace function proteger_colonnes_privilegiees_paiements()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or current_user_type() = 'admin' then
    return new;
  end if;

  -- Seule transition légitime pour le client propriétaire : déclarer son
  -- paiement (-> en_attente_validation, via declarerPaiement). Le saut
  -- direct vers paiement_confirme reste réservé à validerPaiement (admin).
  if new.statut is distinct from old.statut and new.statut != 'en_attente_validation' then
    new.statut := old.statut;
  end if;

  -- declarerPaiement réinitialise valide_par/valide_at à null lors d'une
  -- redéclaration après rejet : autoriser la remise à null, bloquer toute
  -- valeur réelle non admin.
  if new.valide_par is not null and new.valide_par is distinct from old.valide_par then
    new.valide_par := old.valide_par;
  end if;
  if new.valide_at is not null and new.valide_at is distinct from old.valide_at then
    new.valide_at := old.valide_at;
  end if;

  return new;
end;
$$;

drop trigger if exists paiements_proteger_colonnes on paiements;
create trigger paiements_proteger_colonnes
  before update on paiements
  for each row execute function proteger_colonnes_privilegiees_paiements();

-- =====================================================================
-- courses : prix figé après création, assignation coursier restreinte
-- =====================================================================

create or replace function proteger_colonnes_privilegiees_courses()
returns trigger
language plpgsql
as $$
begin
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

  -- Un coursier ne peut s'assigner qu'à lui-même une course non assignée
  -- (acceptation, dashboard.tsx#accepter) ; toute autre écriture de
  -- coursier_id (vers un tiers, ou désassignation) reste réservée à
  -- l'admin (réattribution, courses/page.tsx#reattribuer).
  if new.coursier_id is distinct from old.coursier_id then
    if not (old.coursier_id is null and new.coursier_id = auth.uid()) then
      new.coursier_id := old.coursier_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists courses_proteger_colonnes on courses;
create trigger courses_proteger_colonnes
  before update on courses
  for each row execute function proteger_colonnes_privilegiees_courses();
