-- Audit de sécurité (suite de 0028) : trois failles supplémentaires.
--
-- 1) badges_coursiers avait des policies insert/update ouvertes à
--    "authenticated" sans aucune vérification de propriété ni de rôle —
--    n'importe quel compte connecté pouvait s'auto-attribuer/retirer
--    n'importe quel badge, sur n'importe quel coursier, via un appel REST
--    direct. On bascule sur deux RPC security definer (seul point d'entrée
--    légitime, y compris pour l'automatisation) et on verrouille la table
--    en admin uniquement.
--
-- 2) notations_insert_auteur ne vérifiait que auteur_id = auth.uid(), sans
--    lien avec une course réelle : un utilisateur authentifié pouvait noter
--    n'importe qui (destinataire_id arbitraire) sur n'importe quelle course,
--    y compris une course à laquelle il n'a jamais participé — polluant
--    note_moyenne (recalculée automatiquement, 0023) de n'importe quel
--    coursier.
--
-- 3) Les buckets Storage avatars/documents n'avaient aucune limite de
--    taille ni de type MIME : un upload direct au bucket (avec une session
--    valide, en contournant l'app) pouvait pousser un fichier arbitrairement
--    gros ou d'un type arbitraire (ex. exécutable renommé).

-- =====================================================================
-- badges_coursiers : RPC dédiées + RLS admin uniquement
-- =====================================================================

create or replace function attribuer_badge_coursier(
  p_coursier_id uuid,
  p_badge_id uuid,
  p_attribue_par uuid default null,
  p_expire_le timestamptz default null
)
returns badges_coursiers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existant badges_coursiers;
  v_resultat badges_coursiers;
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  select * into v_existant
  from badges_coursiers
  where coursier_id = p_coursier_id and badge_id = p_badge_id and retire_le is null;

  if found then
    return v_existant;
  end if;

  insert into badges_coursiers (coursier_id, badge_id, attribue_par, expire_le)
  values (p_coursier_id, p_badge_id, p_attribue_par, p_expire_le)
  returning * into v_resultat;

  insert into historique_coursier (coursier_id, action, nouvelle_valeur, administrateur_id)
  values (p_coursier_id, 'attribution_badge', p_badge_id::text, p_attribue_par);

  return v_resultat;
end;
$$;

create or replace function retirer_badge_coursier(
  p_attribution_id uuid,
  p_retire_par uuid default null
)
returns badges_coursiers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultat badges_coursiers;
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  update badges_coursiers
  set retire_le = now(), retire_par = p_retire_par
  where id = p_attribution_id
  returning * into v_resultat;

  if not found then
    raise exception 'Attribution de badge introuvable';
  end if;

  insert into historique_coursier (coursier_id, action, ancienne_valeur, administrateur_id)
  values (v_resultat.coursier_id, 'retrait_badge', v_resultat.badge_id::text, p_retire_par);

  return v_resultat;
end;
$$;

drop policy if exists "badges_coursiers_insert_authenticated" on badges_coursiers;
drop policy if exists "badges_coursiers_update_authenticated" on badges_coursiers;

drop policy if exists "badges_coursiers_all_admin" on badges_coursiers;
create policy "badges_coursiers_all_admin"
  on badges_coursiers for all
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- =====================================================================
-- notations : l'auteur doit être un participant réel de la course notée
-- =====================================================================

drop policy if exists "notations_insert_auteur" on notations;
create policy "notations_insert_auteur"
  on notations for insert
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from courses
      where courses.id = course_id
        and courses.statut in ('livree', 'confirmee')
        and (
          (courses.client_id = auteur_id and courses.coursier_id = destinataire_id)
          or (courses.coursier_id = auteur_id and courses.client_id = destinataire_id)
        )
    )
  );

-- =====================================================================
-- storage : limites de taille et de type MIME sur les buckets existants
-- =====================================================================

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'documents';
