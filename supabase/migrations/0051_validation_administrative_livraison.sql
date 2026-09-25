-- Validation administrative finale d'une course — solution de secours
-- lorsque ni le client ni le coursier n'ont effectué la confirmation finale
-- (0042 : confirmer_reception_client / verifier_otp_livraison). Aucun
-- nouveau statut créé : "Livraison à confirmer" du besoin correspond au
-- statut existant "livree" (coursier a remis le colis, en attente de
-- confirmation) ; "Livraison confirmée / Course clôturée" correspond au
-- statut existant "confirmee". Le cas "contestée" réutilise le statut et le
-- système de litiges existants (0015) plutôt que d'en recréer un.

-- ---------------------------------------------------------------------------
-- Table : historique_validation_admin_livraison — traçabilité obligatoire
-- (besoin section 6), une ligne par tentative de validation administrative,
-- y compris quand elle n'aboutit à aucun changement de statut (résultat
-- "impossible", besoin section 9). Jamais écrasé, jamais mis à jour.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'methode_verification_livraison') then
    create type methode_verification_livraison as enum (
      'client_contacte', 'coursier_contacte', 'client_et_coursier_contactes', 'preuve_verifiee', 'autre'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'resultat_verification_livraison') then
    create type resultat_verification_livraison as enum ('confirmee', 'contestee', 'impossible');
  end if;
end $$;

create table if not exists historique_validation_admin_livraison (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  ancien_statut course_status not null,
  nouveau_statut course_status not null,
  administrateur_id uuid not null references utilisateurs (id),
  methode_verification methode_verification_livraison not null,
  resultat resultat_verification_livraison not null,
  note text,
  -- Toujours 'admin' — colonne présente pour que la ligne s'auto-décrive
  -- (besoin section 6 : "source de validation = ADMIN"), plutôt que de le
  -- déduire implicitement du seul fait que cette table existe.
  source text not null default 'admin' check (source = 'admin'),
  created_at timestamptz not null default now()
);

create index if not exists historique_validation_admin_livraison_course_idx
  on historique_validation_admin_livraison (course_id, created_at desc);

alter table historique_validation_admin_livraison enable row level security;

-- "Cette information doit principalement rester interne au back-office"
-- (besoin section 7) : contrairement à historique_confirmation_livraison,
-- pas de visibilité client/coursier ici, admin uniquement.
drop policy if exists "historique_validation_admin_livraison_select_admin" on historique_validation_admin_livraison;
create policy "historique_validation_admin_livraison_select_admin"
  on historique_validation_admin_livraison for select
  using (current_user_type() = 'admin');

-- Aucune policy insert/update : écriture exclusivement via la RPC ci-dessous.

-- ---------------------------------------------------------------------------
-- RPC valider_livraison_admin — seul point d'entrée. Vérifie le rôle admin,
-- l'existence et le statut de la course, applique la décision, et journalise
-- systématiquement (besoin section 12 : contrôle côté serveur, jamais un
-- simple masquage de bouton côté interface).
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

  -- Note facultative pour une livraison confirmée, obligatoire dans tous
  -- les autres cas (besoin section 4).
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

    -- Aligne confirmations_livraison (0042) sur la réalité : sans ça, la
    -- colonne "Preuve de livraison" du back-office continuerait d'afficher
    -- "En attente du client" alors que la course est déjà clôturée.
    update confirmations_livraison
    set client_confirmation_statut = 'confirme', client_confirme_at = now(), finalise_at = now()
    where course_id = p_course_id and client_confirmation_statut = 'en_attente';

    insert into historique_confirmation_livraison (course_id, evenement, utilisateur_id, details)
    values (p_course_id, 'livraison_finalisee', auth.uid(), jsonb_build_object('source', 'admin'));

  elsif p_resultat = 'contestee' then
    v_nouveau_statut := 'litige';

    update courses set statut = 'litige' where id = p_course_id returning * into v_course;

    -- Fait apparaître la course dans le système de litiges existant (besoin
    -- section 8) avec le contexte complet, plutôt que de la laisser
    -- "litige" sans aucun rapport associé sur cette page.
    insert into litiges (course_id, auteur_id, motif, commentaire)
    values (p_course_id, auth.uid(), 'autre', 'Vérification administrative — livraison contestée. ' || p_note);

  else
    -- 'impossible' : aucun changement de statut, seule la tentative est
    -- journalisée (besoin section 9).
    v_nouveau_statut := v_course.statut;
  end if;

  insert into historique_validation_admin_livraison
    (course_id, ancien_statut, nouveau_statut, administrateur_id, methode_verification, resultat, note)
  values
    (p_course_id, v_ancien_statut, v_nouveau_statut, auth.uid(), p_methode::methode_verification_livraison, p_resultat::resultat_verification_livraison, nullif(trim(p_note), ''));

  return v_course;
end;
$$;

grant execute on function valider_livraison_admin(uuid, text, text, text) to authenticated;
