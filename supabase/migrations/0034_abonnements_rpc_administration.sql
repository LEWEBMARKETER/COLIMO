-- Module Abonnements commerçants — 4/4 : RPC d'administration (activation
-- manuelle, hors plateforme), demandes d'activation, notifications.

-- =====================================================================
-- Activation / désactivation / suspension — réservées à l'admin
-- =====================================================================

create or replace function activer_abonnement_commerce(
  p_commerce_id uuid,
  p_pack text,
  p_date_debut date default current_date,
  p_duree_jours integer default 30,
  p_motif text default null
)
returns commercants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce commercants;
  v_ancien_forfait text;
  v_action text;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;
  if p_pack not in ('starter', 'business') then
    raise exception 'Palier invalide.';
  end if;

  select * into v_commerce from commercants where id = p_commerce_id;
  if not found then
    raise exception 'Commerce introuvable.';
  end if;

  v_ancien_forfait := v_commerce.subscription_plan;
  v_action := case
    when v_ancien_forfait = 'gratuit' or v_commerce.abonnement_suspendu then 'activation'
    else 'renouvellement'
  end;

  perform set_config('colimo.systeme_interne', 'true', true);

  update commercants
  set subscription_plan = p_pack,
      abonnement_debute_le = p_date_debut::timestamptz,
      abonnement_expire_le = p_date_debut::timestamptz + (p_duree_jours || ' days')::interval,
      abonnement_suspendu = false
  where id = p_commerce_id
  returning * into v_commerce;

  insert into historique_abonnements
    (commerce_id, administrateur_id, action, ancien_forfait, nouveau_forfait, date_expiration, motif)
  values
    (p_commerce_id, auth.uid(), v_action, v_ancien_forfait, p_pack, v_commerce.abonnement_expire_le, p_motif);

  update demandes_abonnement
  set statut = 'active'
  where commerce_id = p_commerce_id and statut not in ('active', 'refuse', 'expire');

  return v_commerce;
end;
$$;

create or replace function desactiver_abonnement_commerce(p_commerce_id uuid, p_motif text default null)
returns commercants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce commercants;
  v_ancien_forfait text;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  select * into v_commerce from commercants where id = p_commerce_id;
  if not found then
    raise exception 'Commerce introuvable.';
  end if;
  v_ancien_forfait := v_commerce.subscription_plan;

  perform set_config('colimo.systeme_interne', 'true', true);

  update commercants
  set subscription_plan = 'gratuit', abonnement_debute_le = null, abonnement_expire_le = null, abonnement_suspendu = false
  where id = p_commerce_id
  returning * into v_commerce;

  insert into historique_abonnements (commerce_id, administrateur_id, action, ancien_forfait, nouveau_forfait, motif)
  values (p_commerce_id, auth.uid(), 'desactivation', v_ancien_forfait, 'gratuit', p_motif);

  return v_commerce;
end;
$$;

create or replace function suspendre_abonnement_commerce(p_commerce_id uuid, p_motif text default null)
returns commercants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce commercants;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  perform set_config('colimo.systeme_interne', 'true', true);

  update commercants set abonnement_suspendu = true where id = p_commerce_id returning * into v_commerce;
  if not found then
    raise exception 'Commerce introuvable.';
  end if;

  insert into historique_abonnements (commerce_id, administrateur_id, action, ancien_forfait, nouveau_forfait, motif)
  values (p_commerce_id, auth.uid(), 'suspension', v_commerce.subscription_plan, v_commerce.subscription_plan, p_motif);

  return v_commerce;
end;
$$;

create or replace function reactiver_abonnement_commerce(p_commerce_id uuid, p_motif text default null)
returns commercants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce commercants;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  perform set_config('colimo.systeme_interne', 'true', true);

  update commercants set abonnement_suspendu = false where id = p_commerce_id returning * into v_commerce;
  if not found then
    raise exception 'Commerce introuvable.';
  end if;

  insert into historique_abonnements (commerce_id, administrateur_id, action, ancien_forfait, nouveau_forfait, motif)
  values (p_commerce_id, auth.uid(), 'reactivation', v_commerce.subscription_plan, v_commerce.subscription_plan, p_motif);

  return v_commerce;
end;
$$;

-- =====================================================================
-- Demandes d'activation (commerçant) et refus (admin)
-- =====================================================================

create or replace function demander_activation_abonnement(p_pack text)
returns demandes_abonnement
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commerce_id uuid;
  v_resultat demandes_abonnement;
begin
  if p_pack not in ('starter', 'business') then
    raise exception 'Palier invalide.';
  end if;

  v_commerce_id := commerce_id_pour_utilisateur(auth.uid());
  if v_commerce_id is null then
    raise exception 'Aucun commerce associé à ce compte.';
  end if;

  insert into demandes_abonnement (commerce_id, utilisateur_id, pack_demande, statut)
  values (v_commerce_id, auth.uid(), p_pack, 'demande_envoyee')
  returning * into v_resultat;

  return v_resultat;
end;
$$;

create or replace function refuser_demande_abonnement(p_demande_id uuid, p_motif text default null)
returns demandes_abonnement
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultat demandes_abonnement;
begin
  if current_user_type() != 'admin' then
    raise exception 'Action réservée aux administrateurs.';
  end if;

  update demandes_abonnement set statut = 'refuse' where id = p_demande_id returning * into v_resultat;
  if not found then
    raise exception 'Demande introuvable.';
  end if;

  insert into historique_abonnements (commerce_id, administrateur_id, action, ancien_forfait, nouveau_forfait, motif)
  values (v_resultat.commerce_id, auth.uid(), 'refus', null, v_resultat.pack_demande, p_motif);

  return v_resultat;
end;
$$;

-- =====================================================================
-- Communication Center
-- =====================================================================

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('abonnement_demande_recue', 'push', 'Demande d''abonnement reçue (in-app)',
   E'Votre demande pour le {{pack}} a bien été reçue. Contactez COLIMO pour finaliser le paiement.',
   array['pack']),
  ('abonnement_active', 'push', 'Abonnement activé (in-app)',
   E'Votre {{pack}} est actif jusqu''au {{date_expiration}}.',
   array['pack', 'date_expiration']),
  ('abonnement_expire', 'push', 'Abonnement expiré (in-app)',
   E'Votre abonnement a expiré. Votre compte est repassé au niveau Gratuit.',
   array[]::text[]),
  ('abonnement_refuse', 'push', 'Demande d''abonnement refusée (in-app)',
   E'Votre demande pour le {{pack}} a été refusée. Contactez COLIMO pour plus d''informations.',
   array['pack'])
on conflict (code) do nothing;
