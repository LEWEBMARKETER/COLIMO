-- Suivi public d'une course par le destinataire du colis — qui n'a, la
-- plupart du temps, aucun compte COLIMO. Le lien lui est envoyé via la
-- notification WhatsApp "livraison_creee" déjà existante (packages/shared/
-- src/communication/events), déclenchée à la création de la course.
--
-- RLS reste inchangée sur `courses` : chaque politique existante repose sur
-- auth.uid()/current_user_type(), qu'un visiteur non authentifié n'a jamais.
-- Un accès public passe donc exclusivement par une fonction security
-- definer dédiée, qui ne renvoie QUE la ligne correspondant à un jeton
-- imprévisible (uuid aléatoire, distinct de l'id), et volontairement PAS le
-- prix/mode de paiement/commission/réduction (non pertinents pour le
-- destinataire, cf. clarification produit) — jamais transmis, pas juste
-- masqués côté écran.

alter table courses add column if not exists token_suivi uuid not null default gen_random_uuid() unique;

create or replace function get_course_suivi_public(p_token uuid)
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
    c.acceptee_at,
    c.recuperee_at,
    c.livree_at,
    c.confirmee_at,
    c.created_at
  from courses c
  left join utilisateurs u on u.id = c.coursier_id
  left join coursiers co on co.utilisateur_id = c.coursier_id
  where c.token_suivi = p_token;
$$;

grant execute on function get_course_suivi_public(uuid) to anon, authenticated;

-- Ajoute le lien de suivi au modèle WhatsApp envoyé au destinataire à la
-- création de la course — UNIQUEMENT si son contenu est encore celui du
-- seed d'origine (0020), pour ne jamais écraser une personnalisation déjà
-- faite par un admin depuis Communication Center > Templates. Si la
-- condition ne correspond pas, ajouter {{lien_suivi}} manuellement dans
-- l'admin.
update modeles_notification
set
  contenu = E'Bonjour {{nom_client}},\n\nVotre demande de livraison COLIMO ({{numero_commande}}) a été enregistrée. Un coursier va bientôt être assigné.\n\nSuivez votre livraison en temps réel : {{lien_suivi}}',
  variables = array['nom_client', 'numero_commande', 'lien_suivi']
where code = 'whatsapp_livraison_creee'
  and contenu = E'Bonjour {{nom_client}},\n\nVotre demande de livraison COLIMO ({{numero_commande}}) a été enregistrée. Un coursier va bientôt être assigné.';
