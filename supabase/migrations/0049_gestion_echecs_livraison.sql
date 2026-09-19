-- Module Gestion des échecs de livraison (COLIMO PRO — évolution demandée,
-- section 2.J/3.E). Jusqu'ici seuls l'annulation (0030, avant retrait) et le
-- litige (désaccord nécessitant un arbitrage COLIMO) existaient ; rien ne
-- couvrait le cas où le coursier est sur place, colis en main, mais ne peut
-- pas le remettre (client absent, adresse incorrecte, colis refusé...).
--
-- Workflow : le coursier déclare l'échec avec un motif obligatoire ->
-- statut "echouee" (0048) -> le client (propriétaire de la course, ou
-- l'admin) choisit la suite : nouvelle tentative (la course retourne dans
-- le pool de recherche de coursier) ou retour au commerçant.

alter table courses add column if not exists echouee_at timestamptz;

-- =====================================================================
-- historique_echecs_livraison
-- =====================================================================

create table if not exists historique_echecs_livraison (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  numero_tentative integer not null default 1,
  motif text not null check (motif in
    ('client_absent', 'telephone_injoignable', 'adresse_incorrecte', 'client_refuse', 'probleme_colis', 'autre')),
  commentaire text,
  coursier_id uuid not null references utilisateurs (id),
  decision text check (decision in ('nouvelle_tentative', 'retour')),
  decide_par uuid references utilisateurs (id),
  decide_at timestamptz,
  nouvelle_date_prevue timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists historique_echecs_livraison_course_idx
  on historique_echecs_livraison (course_id, created_at desc);

alter table historique_echecs_livraison enable row level security;

-- Visible par le client de la course, le coursier qui a déclaré l'échec, et
-- l'admin — même périmètre que historique_confirmation_livraison (0042).
drop policy if exists "historique_echecs_livraison_select_participants_or_admin" on historique_echecs_livraison;
create policy "historique_echecs_livraison_select_participants_or_admin"
  on historique_echecs_livraison for select
  using (
    current_user_type() = 'admin'
    or coursier_id = auth.uid()
    or course_id in (select id from courses where client_id = auth.uid())
  );

-- Aucune policy insert/update : écriture exclusivement via les RPC ci-dessous.

-- =====================================================================
-- RPC declarer_echec_livraison — coursier assigné uniquement, pendant
-- "retrait" ou "en_cours" (colis déjà en sa possession — mêmes statuts que
-- ceux depuis lesquels un litige peut être signalé côté app).
-- =====================================================================

create or replace function declarer_echec_livraison(
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
  v_numero_tentative integer;
begin
  select * into v_course from courses where id = p_course_id;
  if not found or v_course.coursier_id != auth.uid() then
    raise exception 'Course introuvable ou vous n''êtes pas le coursier assigné.';
  end if;

  if v_course.statut not in ('retrait', 'en_cours') then
    raise exception 'Une livraison ne peut être signalée en échec qu''après le retrait du colis.';
  end if;

  if p_motif not in ('client_absent', 'telephone_injoignable', 'adresse_incorrecte', 'client_refuse', 'probleme_colis', 'autre') then
    raise exception 'Motif invalide.';
  end if;

  select coalesce(max(numero_tentative), 0) + 1 into v_numero_tentative
  from historique_echecs_livraison where course_id = p_course_id;

  perform set_config('colimo.systeme_interne', 'true', true);

  update courses set statut = 'echouee', echouee_at = now() where id = p_course_id
  returning * into v_course;

  insert into historique_echecs_livraison (course_id, numero_tentative, motif, commentaire, coursier_id)
  values (p_course_id, v_numero_tentative, p_motif, p_commentaire, auth.uid());

  return v_course;
end;
$$;

grant execute on function declarer_echec_livraison(uuid, text, text) to authenticated;

-- =====================================================================
-- RPC traiter_echec_livraison — client propriétaire de la course, ou admin.
-- =====================================================================

create or replace function traiter_echec_livraison(
  p_echec_id uuid,
  p_decision text,
  p_nouvelle_date timestamptz default null
)
returns courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_echec historique_echecs_livraison;
  v_course courses;
begin
  select * into v_echec from historique_echecs_livraison where id = p_echec_id;
  if not found then
    raise exception 'Signalement d''échec introuvable.';
  end if;
  if v_echec.decision is not null then
    raise exception 'Cet échec a déjà été traité.';
  end if;

  select * into v_course from courses where id = v_echec.course_id;
  if not found or v_course.statut != 'echouee' then
    raise exception 'Cette course n''est plus en attente de décision.';
  end if;
  if v_course.client_id != auth.uid() and current_user_type() != 'admin' then
    raise exception 'Seul le client à l''origine de la course (ou un administrateur) peut décider de la suite.';
  end if;

  if p_decision not in ('nouvelle_tentative', 'retour') then
    raise exception 'Décision invalide.';
  end if;

  perform set_config('colimo.systeme_interne', 'true', true);

  if p_decision = 'nouvelle_tentative' then
    -- Retour dans le pool de recherche (premier arrivé, premier servi, comme
    -- à la création) : coursier_id réinitialisé, et les horodatages de
    -- l'attribution/retrait précédents effacés pour que le prochain passage
    -- par set_course_status_timestamps (0018, qui ne pose ces valeurs que si
    -- elles sont encore nulles) reflète la nouvelle tentative, pas l'échouée.
    update courses
    set statut = 'en_attente', coursier_id = null, echouee_at = null,
        acceptee_at = null, recuperee_at = null,
        programmee_pour = coalesce(p_nouvelle_date, programmee_pour)
    where id = v_course.id
    returning * into v_course;
  else
    -- Politique de retour colis existante (packages/shared/src/pricing,
    -- TAUX_FRAIS_RETOUR_COLIS = 50 % — déjà appliquée au retour décidé après
    -- litige, resoudre_litige/0030) : le client assume la moitié du montant
    -- de la course quand le colis doit être retourné suite à un échec.
    update courses set statut = 'retournee', frais_retour = round(prix * 0.5) where id = v_course.id
    returning * into v_course;
  end if;

  update historique_echecs_livraison
  set decision = p_decision, decide_par = auth.uid(), decide_at = now(), nouvelle_date_prevue = p_nouvelle_date
  where id = p_echec_id;

  return v_course;
end;
$$;

grant execute on function traiter_echec_livraison(uuid, text, timestamptz) to authenticated;

-- =====================================================================
-- Verrouillage des transitions "echouee" — même mécanisme que 0042 pour
-- "livree"/"confirmee" : une session non-admin ne peut atteindre ce statut
-- qu'en passant par declarer_echec_livraison (jamais par écriture directe),
-- ni en sortir qu'en passant par traiter_echec_livraison. CREATE OR REPLACE
-- suffit : le trigger courses_proteger_transition_livree (0042) exécute
-- déjà cette fonction, pas besoin de le recréer.
-- =====================================================================

create or replace function proteger_transition_livree_courses()
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

  if new.statut = 'livree' and old.statut is distinct from 'livree' then
    new.statut := old.statut;
  end if;
  if new.statut = 'confirmee' and old.statut is distinct from 'confirmee' then
    new.statut := old.statut;
  end if;
  if new.statut = 'echouee' and old.statut is distinct from 'echouee' then
    new.statut := old.statut;
  end if;
  if old.statut = 'echouee' and new.statut is distinct from 'echouee' then
    new.statut := old.statut;
  end if;

  return new;
end;
$$;

-- =====================================================================
-- Modèles de notification
-- =====================================================================

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('whatsapp_livraison_echouee', 'whatsapp', 'Livraison échouée (WhatsApp, destinataire)',
   E'Un problème est survenu lors de la livraison de votre commande {{numero_commande}} : {{motif}}. Le commerçant a été prévenu.',
   array['numero_commande', 'motif']),
  ('notification_livraison_echouee', 'push', 'Livraison échouée (in-app, client)',
   E'La livraison de la commande {{numero_commande}} a échoué. Choisissez une nouvelle tentative ou un retour.',
   array['numero_commande']),
  ('notification_echec_livraison_resolu', 'push', 'Décision prise après un échec (in-app, coursier)',
   E'La décision a été prise pour la commande {{numero_commande}} : {{decision}}.',
   array['numero_commande', 'decision'])
on conflict (code) do nothing;
