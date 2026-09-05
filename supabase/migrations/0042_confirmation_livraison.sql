-- Confirmation de livraison sécurisée : code OTP + double confirmation
-- (coursier/client) + photo de preuve. S'appuie entièrement sur l'existant
-- (courses.statut, RLS courses, Communication Center, bucket privé comme
-- "documents") plutôt que de recréer une architecture parallèle :
--   - "en_cours" (colis récupéré, en livraison) -> le coursier peut
--     désormais vérifier l'OTP ; succès -> statut passe à "livree" (déjà le
--     statut existant "en attente de confirmation client", inchangé).
--   - "livree" -> le client confirme -> statut passe à "confirmee" (déjà le
--     comportement existant de track/[id].tsx, inchangé) ; ou finalisation
--     automatique après un délai configurable si le client ne confirme pas.
--
-- Le code OTP n'est JAMAIS lisible par le coursier : la table dédiée
-- restreint sa lecture au client/admin (RLS ligne par ligne, comme partout
-- ailleurs dans ce projet) ; le coursier n'y accède qu'au travers de
-- fonctions security definer qui ne renvoient jamais la colonne code_otp.

-- =============================================================================
-- 1. Configuration (bascule unique, même principe que
--    configuration_paiement_abonnements/configuration_paiements_automatiques)
-- =============================================================================

create table if not exists configuration_confirmation_livraison (
  id int primary key default 1 check (id = 1),
  otp_longueur int not null default 4 check (otp_longueur in (4, 6)),
  otp_validite_minutes int not null default 1440,
  otp_tentatives_max int not null default 5,
  otp_renvois_max int not null default 3,
  delai_auto_finalisation_minutes int not null default 60,
  mis_a_jour_par uuid references utilisateurs (id),
  mis_a_jour_at timestamptz not null default now()
);
insert into configuration_confirmation_livraison (id) values (1) on conflict (id) do nothing;

alter table configuration_confirmation_livraison enable row level security;

create policy "configuration_confirmation_livraison_select_authenticated"
  on configuration_confirmation_livraison for select
  to authenticated
  using (true);

create policy "configuration_confirmation_livraison_update_admin"
  on configuration_confirmation_livraison for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- =============================================================================
-- 2. Confirmation de livraison — une ligne par course, auto-créée à la
--    création de la course (comme code_suivi, 0038).
-- =============================================================================

create or replace function generer_otp_livraison(p_longueur int)
returns text
language plpgsql
as $$
declare
  code text := '';
  i int;
begin
  for i in 1..p_longueur loop
    code := code || floor(random() * 10)::int::text;
  end loop;
  return code;
end;
$$;

create table if not exists confirmations_livraison (
  course_id uuid primary key references courses (id) on delete cascade,
  code_otp text not null,
  otp_genere_at timestamptz not null default now(),
  otp_expire_at timestamptz not null,
  otp_verifie_at timestamptz,
  otp_tentatives int not null default 0,
  otp_renvois int not null default 0,
  otp_dernier_envoi_at timestamptz not null default now(),
  coursier_confirme_at timestamptz,
  client_confirmation_statut text not null default 'en_attente'
    check (client_confirmation_statut in ('en_attente', 'confirme', 'signale', 'auto_finalise')),
  client_confirme_at timestamptz,
  preuve_photo_path text,
  preuve_photo_url text,
  preuve_photo_uploaded_at timestamptz,
  finalise_at timestamptz,
  created_at timestamptz not null default now()
);

alter table confirmations_livraison enable row level security;

-- Coursier volontairement absent de cette policy : il n'accède qu'aux
-- fonctions security definer ci-dessous, jamais à la table directement.
create policy "confirmations_livraison_select_client_ou_admin"
  on confirmations_livraison for select
  using (
    current_user_type() = 'admin'
    or exists (select 1 from courses where courses.id = course_id and courses.client_id = auth.uid())
  );

create policy "confirmations_livraison_update_admin"
  on confirmations_livraison for update
  using (current_user_type() = 'admin')
  with check (current_user_type() = 'admin');

-- Provisionnement automatique à la création de la course — aucune
-- modification requise du code applicatif de création de course.
create or replace function creer_confirmation_livraison()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_longueur int;
  v_validite int;
begin
  select otp_longueur, otp_validite_minutes into v_longueur, v_validite
  from configuration_confirmation_livraison where id = 1;

  insert into confirmations_livraison (course_id, code_otp, otp_expire_at)
  values (
    new.id,
    generer_otp_livraison(coalesce(v_longueur, 4)),
    now() + (coalesce(v_validite, 1440) || ' minutes')::interval
  );

  insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
  values (new.id, 'otp_genere', new.client_id);

  return new;
end;
$$;

drop trigger if exists courses_creer_confirmation_livraison on courses;
create trigger courses_creer_confirmation_livraison
  after insert on courses
  for each row execute function creer_confirmation_livraison();

-- =============================================================================
-- 3. Historique / audit — append-only, visible aux deux parties + admin
--    (utile en cas de litige, cf. besoin section 12).
-- =============================================================================

create table if not exists historique_confirmation_livraison (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  evenement text not null check (evenement in (
    'otp_genere', 'otp_renvoye', 'otp_echec', 'otp_verifie',
    'photo_ajoutee', 'coursier_confirme', 'client_confirme',
    'client_signale', 'livraison_finalisee', 'auto_finalisee'
  )),
  utilisateur_id uuid references utilisateurs (id),
  details jsonb,
  created_at timestamptz not null default now()
);

alter table historique_confirmation_livraison enable row level security;

create policy "historique_confirmation_livraison_select_participants"
  on historique_confirmation_livraison for select
  using (
    current_user_type() = 'admin'
    or exists (
      select 1 from courses
      where courses.id = course_id
        and (courses.client_id = auth.uid() or courses.coursier_id = auth.uid())
    )
  );

-- =============================================================================
-- 4. Fonctions métier — seul point d'entrée pour vérifier/renvoyer l'OTP,
--    ajouter la preuve, confirmer côté client. Le frontend ne peut jamais
--    déclarer arbitrairement une course "livree"/"confirmee" (section 11) :
--    ces fonctions sont les SEULES autorisées à faire progresser le statut
--    au-delà de ce que patchCourse permettait déjà (accepter/retrait/en_cours,
--    annulation — inchangés).
-- =============================================================================

-- Renvoi du code (anti-abus : quota + cooldown 60s) — client uniquement,
-- avant vérification par le coursier.
create or replace function renvoyer_otp_livraison(p_course_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmation confirmations_livraison;
  v_config configuration_confirmation_livraison;
  v_nouveau_code text;
begin
  select * into v_confirmation from confirmations_livraison where course_id = p_course_id;
  if not found then
    raise exception 'Confirmation de livraison introuvable';
  end if;

  if not exists (select 1 from courses where id = p_course_id and client_id = auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  if v_confirmation.otp_verifie_at is not null then
    raise exception 'Le code a déjà été utilisé';
  end if;

  select * into v_config from configuration_confirmation_livraison where id = 1;

  if v_confirmation.otp_renvois >= v_config.otp_renvois_max then
    raise exception 'Nombre maximal de renvois atteint';
  end if;

  if v_confirmation.otp_dernier_envoi_at > now() - interval '60 seconds' then
    raise exception 'Veuillez patienter avant de redemander un code';
  end if;

  v_nouveau_code := generer_otp_livraison(v_config.otp_longueur);

  update confirmations_livraison
  set
    code_otp = v_nouveau_code,
    otp_genere_at = now(),
    otp_expire_at = now() + (v_config.otp_validite_minutes || ' minutes')::interval,
    otp_tentatives = 0,
    otp_renvois = otp_renvois + 1,
    otp_dernier_envoi_at = now()
  where course_id = p_course_id;

  insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
  values (p_course_id, 'otp_renvoye', auth.uid());

  return v_nouveau_code;
end;
$$;

grant execute on function renvoyer_otp_livraison(uuid) to authenticated;

-- Vérification par le coursier — ne renvoie jamais code_otp. Succès ->
-- confirmation coursier + statut course "livree".
create or replace function verifier_otp_livraison(p_course_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmation confirmations_livraison;
  v_config configuration_confirmation_livraison;
  v_course courses;
begin
  select * into v_course from courses where id = p_course_id;
  if not found or v_course.coursier_id is distinct from auth.uid() then
    raise exception 'Accès refusé';
  end if;

  select * into v_confirmation from confirmations_livraison where course_id = p_course_id;
  if not found then
    raise exception 'Confirmation de livraison introuvable';
  end if;

  if v_confirmation.otp_verifie_at is not null then
    return jsonb_build_object('valide', true, 'dejaVerifie', true);
  end if;

  if v_course.statut is distinct from 'en_cours' then
    raise exception 'Cette course n''est pas prête pour une confirmation de livraison';
  end if;

  select * into v_config from configuration_confirmation_livraison where id = 1;

  if v_confirmation.otp_tentatives >= v_config.otp_tentatives_max then
    return jsonb_build_object('valide', false, 'erreur', 'trop_de_tentatives', 'tentativesRestantes', 0);
  end if;

  if now() > v_confirmation.otp_expire_at then
    return jsonb_build_object('valide', false, 'erreur', 'expire', 'tentativesRestantes', v_config.otp_tentatives_max - v_confirmation.otp_tentatives);
  end if;

  if p_code is distinct from v_confirmation.code_otp then
    update confirmations_livraison set otp_tentatives = otp_tentatives + 1 where course_id = p_course_id;
    insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
    values (p_course_id, 'otp_echec', auth.uid());
    return jsonb_build_object(
      'valide', false, 'erreur', 'code_incorrect',
      'tentativesRestantes', greatest(v_config.otp_tentatives_max - v_confirmation.otp_tentatives - 1, 0)
    );
  end if;

  update confirmations_livraison
  set otp_verifie_at = now(), coursier_confirme_at = now()
  where course_id = p_course_id;

  perform set_config('colimo.systeme_interne', 'true', true);
  update courses set statut = 'livree' where id = p_course_id;

  insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
  values (p_course_id, 'otp_verifie', auth.uid()), (p_course_id, 'coursier_confirme', auth.uid());

  return jsonb_build_object('valide', true, 'dejaVerifie', false);
end;
$$;

grant execute on function verifier_otp_livraison(uuid, text) to authenticated;

-- État de confirmation pour le coursier — jamais code_otp.
create or replace function get_etat_confirmation_coursier(p_course_id uuid)
returns table (
  otp_verifie boolean,
  otp_tentatives int,
  otp_tentatives_max int,
  coursier_confirme_at timestamptz,
  client_confirmation_statut text,
  preuve_photo_uploaded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cl.otp_verifie_at is not null,
    cl.otp_tentatives,
    cfg.otp_tentatives_max,
    cl.coursier_confirme_at,
    cl.client_confirmation_statut,
    cl.preuve_photo_uploaded_at
  from confirmations_livraison cl
  cross join configuration_confirmation_livraison cfg
  join courses c on c.id = cl.course_id
  where cl.course_id = p_course_id and c.coursier_id = auth.uid() and cfg.id = 1;
$$;

grant execute on function get_etat_confirmation_coursier(uuid) to authenticated;

-- Enregistrement de la preuve photo — coursier uniquement, après
-- confirmation OTP. Le chemin de stockage (bucket privé delivery-proofs)
-- est fourni par l'app après upload ; l'URL signée est générée côté app
-- (comme documents/uploadFichier) et transmise ici pour être associée.
create or replace function enregistrer_preuve_livraison(p_course_id uuid, p_chemin text, p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from courses where id = p_course_id and coursier_id = auth.uid()) then
    raise exception 'Accès refusé';
  end if;

  if not exists (select 1 from confirmations_livraison where course_id = p_course_id and coursier_confirme_at is not null) then
    raise exception 'La confirmation du coursier doit précéder la preuve photo';
  end if;

  update confirmations_livraison
  set preuve_photo_path = p_chemin, preuve_photo_url = p_url, preuve_photo_uploaded_at = now()
  where course_id = p_course_id;

  insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id)
  values (p_course_id, 'photo_ajoutee', auth.uid());
end;
$$;

grant execute on function enregistrer_preuve_livraison(uuid, text, text) to authenticated;

-- Confirmation (ou signalement) côté client — remplace le patchCourse
-- direct utilisé jusqu'ici pour passer en "confirmee" (track/[id].tsx),
-- désormais conditionné à une confirmation coursier déjà enregistrée.
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
end;
$$;

grant execute on function confirmer_reception_client(uuid, boolean) to authenticated;

-- Finalisation automatique (délai configurable) — appelée par une tâche
-- planifiée Vercel Cron (clé service role), cf. apps/mobile/api/livraison/
-- finaliser-en-attente.ts. Ne bloque jamais définitivement le coursier :
-- une course "livree" sans confirmation client au-delà du délai est
-- finalisée d'office.
create or replace function finaliser_livraisons_en_attente()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delai int;
  v_count int;
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
  insert into historique_confirmation_livraison (course_id, evenement)
  select id, 'auto_finalisee' from maj_courses;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function finaliser_livraisons_en_attente() to service_role;

-- =============================================================================
-- 5. Storage : bucket privé dédié aux preuves de livraison.
--    Chemin : "<course_id>/<fichier>" (dossier = course, pas utilisateur,
--    car client ET coursier doivent pouvoir lire la même preuve).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proofs', 'delivery-proofs', false, 10 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "delivery_proofs_read_participants"
  on storage.objects for select
  using (
    bucket_id = 'delivery-proofs'
    and (
      current_user_type() = 'admin'
      or exists (
        select 1 from courses
        where courses.id::text = (storage.foldername(name))[1]
          and (courses.client_id = auth.uid() or courses.coursier_id = auth.uid())
      )
    )
  );

create policy "delivery_proofs_write_coursier_assigne"
  on storage.objects for insert
  with check (
    bucket_id = 'delivery-proofs'
    and exists (
      select 1 from courses
      where courses.id::text = (storage.foldername(name))[1] and courses.coursier_id = auth.uid()
    )
  );

-- =============================================================================
-- 6. Verrouillage : le statut "livree" ne peut désormais être posé que par
--    verifier_otp_livraison ci-dessus (indicateur transaction-interne), plus
--    par l'admin — jamais directement par un patchCourse client/coursier.
--    "confirmee" reste déjà protégée de la même façon via
--    confirmer_reception_client. Complète proteger_colonnes_privilegiees_courses
--    (0028, étendue en 0038) sans dupliquer ses vérifications existantes.
-- =============================================================================

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

  return new;
end;
$$;

drop trigger if exists courses_proteger_transition_livree on courses;
create trigger courses_proteger_transition_livree
  before update on courses
  for each row execute function proteger_transition_livree_courses();

-- =============================================================================
-- 7. Suivi public (0038) : le destinataire sans compte est souvent la
--    seule personne physiquement présente à la remise — il doit donc aussi
--    voir le code, pas seulement le client. Uniquement pendant la fenêtre
--    où il est utile (en_cours, pas encore vérifié) ; jamais après.
-- =============================================================================

create or replace function get_course_suivi_public(p_code text)
returns table (
  id uuid,
  numero_commande text,
  statut course_status,
  type_colis text,
  categorie_colis categorie_colis,
  adresse_depart text,
  adresse_arrivee text,
  repere_depart text,
  repere_arrivee text,
  latitude_depart double precision,
  longitude_depart double precision,
  latitude_arrivee double precision,
  longitude_arrivee double precision,
  nom_expediteur text,
  telephone_expediteur text,
  nom_destinataire text,
  telephone_destinataire text,
  instructions text,
  programmee_pour timestamptz,
  coursier_id uuid,
  coursier_nom text,
  coursier_prenom text,
  coursier_telephone text,
  coursier_note numeric,
  coursier_latitude double precision,
  coursier_longitude double precision,
  coursier_position_maj_at timestamptz,
  distance_restante_m double precision,
  eta_secondes integer,
  code_otp text,
  acceptee_at timestamptz,
  recuperee_at timestamptz,
  livree_at timestamptz,
  confirmee_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.numero_commande,
    c.statut,
    c.type_colis,
    c.categorie_colis,
    c.adresse_depart,
    c.adresse_arrivee,
    c.repere_depart,
    c.repere_arrivee,
    c.latitude_depart,
    c.longitude_depart,
    c.latitude_arrivee,
    c.longitude_arrivee,
    c.nom_expediteur,
    c.telephone_expediteur,
    c.nom_destinataire,
    c.telephone_destinataire,
    c.instructions,
    c.programmee_pour,
    c.coursier_id,
    u.nom,
    u.prenom,
    u.telephone,
    co.note_moyenne,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.latitude else null end,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.longitude else null end,
    case when c.statut in ('acceptee', 'retrait', 'en_cours') then p.maj_at else null end,
    c.distance_restante_m,
    c.eta_secondes,
    case when c.statut = 'en_cours' and cl.otp_verifie_at is null then cl.code_otp else null end,
    c.acceptee_at,
    c.recuperee_at,
    c.livree_at,
    c.confirmee_at,
    c.created_at
  from courses c
  left join utilisateurs u on u.id = c.coursier_id
  left join coursiers co on co.utilisateur_id = c.coursier_id
  left join positions_coursiers p on p.coursier_id = c.coursier_id
  left join confirmations_livraison cl on cl.course_id = c.id
  where c.code_suivi = p_code;
$$;

grant execute on function get_course_suivi_public(text) to anon, authenticated;

-- =============================================================================
-- 8. Ajoute le code de réception au modèle WhatsApp envoyé au destinataire à
--    la création de la course — UNIQUEMENT si son contenu est encore celui
--    laissé par 0037 (lien_suivi déjà ajouté, rien de plus), pour ne jamais
--    écraser une personnalisation faite depuis Communication Center >
--    Templates. Si la condition ne correspond pas, ajouter {{code_otp}}
--    manuellement dans l'admin.
-- =============================================================================

update modeles_notification
set
  contenu = E'Bonjour {{nom_client}},\n\nVotre demande de livraison COLIMO ({{numero_commande}}) a été enregistrée. Un coursier va bientôt être assigné.\n\nSuivez votre livraison en temps réel : {{lien_suivi}}\n\nVotre code de réception (à donner au coursier uniquement à la remise du colis) : {{code_otp}}',
  variables = array['nom_client', 'numero_commande', 'lien_suivi', 'code_otp']
where code = 'whatsapp_livraison_creee'
  and contenu = E'Bonjour {{nom_client}},\n\nVotre demande de livraison COLIMO ({{numero_commande}}) a été enregistrée. Un coursier va bientôt être assigné.\n\nSuivez votre livraison en temps réel : {{lien_suivi}}';
