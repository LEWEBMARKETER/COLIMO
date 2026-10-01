-- Recherche d'un coursier — délai d'attente (3/4) : étend l'unique RPC
-- d'annulation client existante (annuler_course_client, 0030) — aucune
-- nouvelle fonction d'annulation créée (section 9 de la mission : une
-- seule logique centrale). Toutes les lignes existantes sont conservées à
-- l'identique pour tout motif autre que 'no_courier_available'.
--
-- Au passage, corrige un bug préexistant dans le journal
-- historique_annulations : v_course était réassigné par le "update ...
-- returning * into v_course" AVANT l'insert qui utilisait encore
-- v_course.statut pour statut_precedent — ce champ enregistrait donc
-- toujours 'annulee' au lieu du statut réel avant annulation. Capturé
-- maintenant dans v_statut_precedent avant toute écriture, comme le fait
-- déjà valider_livraison_admin (0051) pour le même besoin.
create or replace function annuler_course_client(
  p_course_id uuid,
  p_motif text,
  p_commentaire text default null
)
returns courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_role text;
  v_statut_precedent course_status;
begin
  select * into v_course from courses where id = p_course_id;
  if not found or v_course.client_id != auth.uid() then
    raise exception 'Course introuvable ou vous n''êtes pas autorisé à l''annuler.';
  end if;

  if v_course.statut not in ('en_attente_paiement', 'en_attente', 'acceptee', 'retrait') then
    raise exception 'Cette course ne peut plus être annulée car le colis a déjà été récupéré par le coursier.';
  end if;

  select case when type_client = 'commerce' then 'client_commerce' else 'client_particulier' end
  into v_role
  from utilisateurs where id = auth.uid();

  v_statut_precedent := v_course.statut;

  perform set_config('colimo.systeme_interne', 'true', true);

  if p_motif = 'no_courier_available' then
    -- Annulation "aucun coursier disponible" (besoin CAS B/E) : condition
    -- vérifiée atomiquement dans la clause WHERE elle-même plutôt que par
    -- un SELECT préalable, pour fermer la fenêtre de course avec un
    -- coursier qui accepterait entre la lecture ci-dessus et l'écriture.
    update courses
    set statut = 'annulee',
        annulee_par = auth.uid(),
        motif_annulation = p_motif,
        commentaire_annulation = p_commentaire
    where id = p_course_id
      and coursier_id is null
      and statut = 'en_attente'
    returning * into v_course;

    if not found then
      -- Un coursier a accepté entre-temps : on ne l'annule jamais pour ce
      -- motif précis (CAS E). Le frontend intercepte ce message exact pour
      -- afficher "Bonne nouvelle, un coursier a accepté" puis basculer
      -- vers le suivi normal, au lieu d'un message d'erreur générique.
      raise exception 'coursier_deja_accepte';
    end if;
  else
    update courses
    set statut = 'annulee',
        annulee_par = auth.uid(),
        motif_annulation = p_motif,
        commentaire_annulation = p_commentaire
    where id = p_course_id
    returning * into v_course;
  end if;

  insert into historique_annulations
    (course_id, utilisateur_id, role, motif, commentaire, statut_precedent, nouveau_statut)
  values
    (p_course_id, auth.uid(), v_role, p_motif, p_commentaire, v_statut_precedent, 'annulee');

  return v_course;
end;
$$;
