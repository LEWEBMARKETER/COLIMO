-- Module Annulation des courses.
--
-- Objectif : le client (particulier ou commerçant) peut annuler sa course
-- UNIQUEMENT tant que le coursier n'a pas récupéré le colis ; l'admin peut
-- annuler à tout moment avec motif obligatoire ; toute tentative
-- d'annulation hors fenêtre (ou par un tiers) doit être bloquée côté
-- serveur, pas seulement côté interface — même en cas d'appel API direct
-- contournant l'application.
--
-- Aujourd'hui rien n'empêche ça : courses_update_client_coursier_or_admin
-- (0001) autorise client_id = auth.uid() à écrire `statut` sans aucune
-- restriction de fenêtre, et le trigger de verrouillage des colonnes
-- privilégiées (0028, proteger_colonnes_privilegiees_courses) ne couvre pas
-- `statut`. Cette migration ferme ce trou en forçant tout passage à
-- `statut = 'annulee'` par une session non-admin à transiter par la RPC
-- annuler_course_client ci-dessous (seule habilitée à contourner le
-- trigger, via l'indicateur transaction-locale déjà utilisé dans 0028/0029).

-- =====================================================================
-- Colonnes
-- =====================================================================

alter table courses add column if not exists annulee_par uuid references utilisateurs (id);
alter table courses add column if not exists motif_annulation text;
alter table courses add column if not exists commentaire_annulation text;
alter table courses add column if not exists statut_avant_litige course_status;

alter table litiges add column if not exists resolution text;
alter table litiges add column if not exists resolution_motif text;
alter table litiges add column if not exists resolution_commentaire text;
alter table litiges add column if not exists resolution_montant numeric(10, 2);
alter table litiges add column if not exists resolue_par uuid references utilisateurs (id);
alter table litiges add column if not exists resolue_at timestamptz;

-- =====================================================================
-- historique_annulations : audit append-only (même rôle que
-- historique_coursier, 0024, pour les courses)
-- =====================================================================

create table if not exists historique_annulations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  utilisateur_id uuid not null references utilisateurs (id),
  role text not null,
  motif text not null,
  commentaire text,
  statut_precedent course_status not null,
  nouveau_statut course_status not null,
  created_at timestamptz not null default now()
);

create index if not exists historique_annulations_course_id_created_at_idx
  on historique_annulations (course_id, created_at desc);

alter table historique_annulations enable row level security;

-- Lecture admin uniquement (même raisonnement que historique_coursier : le
-- client voit déjà son propre motif via courses.motif_annulation). Aucune
-- policy insert/update — l'écriture passe exclusivement par les RPC
-- security definer ci-dessous.
drop policy if exists "historique_annulations_select_admin" on historique_annulations;
create policy "historique_annulations_select_admin"
  on historique_annulations for select
  using (current_user_type() = 'admin');

-- =====================================================================
-- set_course_status_timestamps (0018) : mémorise le statut avant un
-- passage en litige, pour pouvoir le restaurer (résolutions "maintenir" /
-- "rejeter" / remboursements ci-dessous)
-- =====================================================================

create or replace function set_course_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.statut is distinct from old.statut then
    case new.statut
      when 'acceptee' then new.acceptee_at := coalesce(new.acceptee_at, now());
      when 'retrait' then new.recuperee_at := coalesce(new.recuperee_at, now());
      when 'livree' then new.livree_at := coalesce(new.livree_at, now());
      when 'confirmee' then new.confirmee_at := coalesce(new.confirmee_at, now());
      when 'annulee' then new.annulee_at := coalesce(new.annulee_at, now());
      when 'litige' then new.statut_avant_litige := old.statut;
      else null;
    end case;
  end if;
  return new;
end;
$$;

-- =====================================================================
-- proteger_colonnes_privilegiees_courses (0028) : ajoute le bypass
-- transaction-locale (les RPC ci-dessous s'exécutent avec auth.uid() =
-- l'appelant, pas admin) et bloque toute écriture directe de
-- statut = 'annulee' par une session non-admin, quel que soit le statut
-- actuel — l'annulation doit passer par annuler_course_client (qui vérifie
-- la fenêtre et trace l'historique) ou annuler_course_admin.
-- =====================================================================

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

  if new.coursier_id is distinct from old.coursier_id then
    if not (old.coursier_id is null and new.coursier_id = auth.uid()) then
      new.coursier_id := old.coursier_id;
    end if;
  end if;

  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    raise exception 'Utilisez la fonction d''annulation dédiée pour annuler une course.';
  end if;

  return new;
end;
$$;

-- =====================================================================
-- RPC annuler_course_client : seul point d'entrée pour qu'un client
-- annule sa propre course, dans la fenêtre autorisée.
-- =====================================================================

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

  perform set_config('colimo.systeme_interne', 'true', true);

  update courses
  set statut = 'annulee',
      annulee_par = auth.uid(),
      motif_annulation = p_motif,
      commentaire_annulation = p_commentaire
  where id = p_course_id
  returning * into v_course;

  insert into historique_annulations
    (course_id, utilisateur_id, role, motif, commentaire, statut_precedent, nouveau_statut)
  values
    (p_course_id, auth.uid(), v_role, p_motif, p_commentaire, v_course.statut, 'annulee');

  return v_course;
end;
$$;

-- =====================================================================
-- RPC annuler_course_admin : disponible quel que soit le statut de la
-- course, motif obligatoire.
-- =====================================================================

create or replace function annuler_course_admin(
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
  v_statut_precedent course_status;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  select * into v_course from courses where id = p_course_id;
  if not found then
    raise exception 'Course introuvable.';
  end if;
  if v_course.statut = 'annulee' then
    raise exception 'Cette course est déjà annulée.';
  end if;

  v_statut_precedent := v_course.statut;

  perform set_config('colimo.systeme_interne', 'true', true);

  update courses
  set statut = 'annulee',
      annulee_par = auth.uid(),
      motif_annulation = p_motif,
      commentaire_annulation = p_commentaire
  where id = p_course_id
  returning * into v_course;

  insert into historique_annulations
    (course_id, utilisateur_id, role, motif, commentaire, statut_precedent, nouveau_statut)
  values
    (p_course_id, auth.uid(), 'admin', p_motif, p_commentaire, v_statut_precedent, 'annulee');

  return v_course;
end;
$$;

-- =====================================================================
-- RPC resoudre_litige : les 6 issues possibles pour une course en litige.
-- Remboursements = enregistrement + notification uniquement (aucune
-- passerelle de paiement automatisée n'existe côté COLIMO aujourd'hui) :
-- la livraison reprend son statut précédent, seule la décision est tracée.
-- =====================================================================

create or replace function resoudre_litige(
  p_course_id uuid,
  p_resolution text,
  p_motif text default null,
  p_commentaire text default null,
  p_montant numeric default null
)
returns courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course courses;
  v_litige_id uuid;
  v_statut_precedent course_status;
  v_nouveau_statut course_status;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  if p_resolution not in ('maintenue', 'annulee', 'retour', 'remboursement_partiel', 'remboursement_total', 'rejetee') then
    raise exception 'Résolution invalide.';
  end if;

  select * into v_course from courses where id = p_course_id;
  if not found or v_course.statut != 'litige' then
    raise exception 'Cette course n''est pas en litige.';
  end if;

  select id into v_litige_id from litiges where course_id = p_course_id order by created_at desc limit 1;

  v_statut_precedent := v_course.statut;

  perform set_config('colimo.systeme_interne', 'true', true);

  case p_resolution
    when 'maintenue', 'rejetee' then
      v_nouveau_statut := coalesce(v_course.statut_avant_litige, 'en_cours');
      update courses set statut = v_nouveau_statut, statut_avant_litige = null
      where id = p_course_id returning * into v_course;

    when 'annulee' then
      v_nouveau_statut := 'annulee';
      update courses
      set statut = 'annulee',
          frais_retour = 0,
          annulee_par = auth.uid(),
          motif_annulation = coalesce(p_motif, 'Litige confirmé'),
          commentaire_annulation = p_commentaire,
          statut_avant_litige = null
      where id = p_course_id returning * into v_course;

      insert into historique_annulations
        (course_id, utilisateur_id, role, motif, commentaire, statut_precedent, nouveau_statut)
      values
        (p_course_id, auth.uid(), 'admin', coalesce(p_motif, 'Litige confirmé'), p_commentaire, v_statut_precedent, 'annulee');

    when 'retour' then
      v_nouveau_statut := 'retournee';
      update courses
      set statut = 'retournee', frais_retour = round(prix * 0.5), statut_avant_litige = null
      where id = p_course_id returning * into v_course;

    when 'remboursement_partiel', 'remboursement_total' then
      v_nouveau_statut := coalesce(v_course.statut_avant_litige, 'en_cours');
      update courses set statut = v_nouveau_statut, statut_avant_litige = null
      where id = p_course_id returning * into v_course;
  end case;

  if v_litige_id is not null then
    update litiges
    set resolution = p_resolution,
        resolution_motif = p_motif,
        resolution_commentaire = p_commentaire,
        resolution_montant = case
          when p_resolution = 'remboursement_partiel' then p_montant
          when p_resolution = 'remboursement_total' then v_course.prix
          else null
        end,
        resolue_par = auth.uid(),
        resolue_at = now()
    where id = v_litige_id;
  end if;

  return v_course;
end;
$$;

-- =====================================================================
-- Communication Center : un seul nouveau modèle (le reste est réutilisé
-- tel quel — livraison_annulee, notification_livraison_annulee,
-- litige_resolu, notification_litige_resolu sont déjà câblés ailleurs).
-- =====================================================================

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('notification_livraison_annulee_coursier', 'push', 'Livraison annulée par le client (in-app, coursier)',
   E'La course {{numero_commande}} a été annulée par le client.',
   array['numero_commande'])
on conflict (code) do nothing;
