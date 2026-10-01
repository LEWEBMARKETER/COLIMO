-- Recherche d'un coursier — délai d'attente (2/4) : marque qu'un client a
-- choisi de prolonger la recherche après expiration du délai indicatif
-- (besoin section 7). Persisté (pas un simple état React éphémère) pour
-- que l'admin le voie (section 17) et que l'écran client ne re-propose pas
-- le choix après une fermeture/réouverture de l'app.

alter table courses add column if not exists recherche_prolongee_at timestamptz;

-- Reprend la protection de colonnes de 0054 (dernière version), en y
-- ajoutant recherche_prolongee_at à la liste des colonnes qu'une session
-- non-admin ne peut écrire que via le bypass transaction-locale
-- colimo.systeme_interne — même mécanisme que commission.
--
-- Corrige au passage une régression préexistante, sans rapport avec cette
-- mission mais trouvée en auditant cette même fonction (comme demandé) :
-- 0030_annulation_courses.sql avait ajouté un blocage explicite de toute
-- écriture directe statut='annulee' par une session non-admin (forçant le
-- passage par annuler_course_client, seule à historiser l'annulation). La
-- redéfinition suivante de cette fonction (0038_geolocalisation_coursiers.sql,
-- pour les colonnes ETA) a recopié la version de 0028 sans ce blocage,
-- silencieusement perdu depuis — toute session cliente/coursier authentifiée
-- peut aujourd'hui annuler une course par un PATCH direct, sans passer par
-- la RPC dédiée ni laisser de trace dans historique_annulations. Restauré
-- ici à l'identique de ce que 0030 avait posé.
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
  if new.recherche_prolongee_at is distinct from old.recherche_prolongee_at then
    new.recherche_prolongee_at := old.recherche_prolongee_at;
  end if;

  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    raise exception 'Utilisez la fonction d''annulation dédiée pour annuler une course.';
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

-- RPC étroite et ciblée (même convention que renvoyer_otp_livraison, etc.)
-- : seul point d'écriture de recherche_prolongee_at. Idempotente (pas
-- d'exception si déjà posée ou si la course n'est plus éligible : un
-- coursier qui vient d'accepter rend simplement cet appel sans effet,
-- l'écran client bascule de toute façon vers le suivi normal).
create or replace function prolonger_recherche_coursier(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('colimo.systeme_interne', 'true', true);

  update courses
  set recherche_prolongee_at = now()
  where id = p_course_id
    and client_id = auth.uid()
    and coursier_id is null
    and statut = 'en_attente'
    and recherche_prolongee_at is null;
end;
$$;

grant execute on function prolonger_recherche_coursier(uuid) to authenticated;
