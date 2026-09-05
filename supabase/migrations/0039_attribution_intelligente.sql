-- Attribution intelligente des courses (mise en avant du meilleur match).
--
-- Le modèle d'attribution existant ne change pas : le pool de courses
-- disponibles reste visible à tous les coursiers éligibles d'une zone,
-- premier arrivé premier servi (cf. dashboard.tsx#accepterCourse). Cette
-- migration ajoute uniquement le moyen d'identifier, pour une course tout
-- juste publiée, les coursiers les mieux placés (zone couverte + note +
-- taux d'annulation) afin de leur envoyer une notification prioritaire —
-- rien de plus. Aucune géolocalisation GPS supplémentaire : contrairement
-- au suivi temps réel (0038, actif uniquement pendant une course), ceci
-- s'appuie sur les zones couvertes déjà déclarées par le coursier.
--
-- Sécurité : la RLS sur `coursiers` (0001) n'autorise un client à voir que
-- les coursiers déjà assignés à l'une de ses courses — un client créant une
-- course ne peut donc pas, par construction, lister les coursiers d'une
-- zone (ce qui exposerait leurs numéros de téléphone à quiconque). La
-- fonction ci-dessous, security definer, ne contourne cette restriction que
-- pour LA course dont l'appelant est le client, tant qu'elle n'a pas encore
-- de coursier assigné.

create or replace function get_coursiers_eligibles_course(p_course_id uuid)
returns table (
  coursier_id uuid,
  telephone text,
  nom text,
  prenom text,
  note_moyenne numeric,
  nombre_courses_assignees integer,
  nombre_courses_annulees integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.telephone,
    u.nom,
    u.prenom,
    co.note_moyenne,
    co.nombre_courses_assignees,
    co.nombre_courses_annulees
  from courses c
  join coursiers co
    on co.statut = 'en_ligne'
    and co.disponibilite = true
    and c.zone_depart = any (co.zones_couvertes)
  join utilisateurs u on u.id = co.utilisateur_id
  where c.id = p_course_id
    and c.client_id = auth.uid()
    and c.coursier_id is null
    and c.statut = 'en_attente';
$$;

grant execute on function get_coursiers_eligibles_course(uuid) to authenticated;

-- Variante in-app (canal push) de l'événement whatsapp_coursier_nouvelle_course_disponible
-- (déjà catalogué en 0022 mais jamais déclenché) : celle-ci est désormais
-- réellement câblée (cf. packages/shared/src/coursiers/attribution).
insert into modeles_notification (code, type, nom, contenu, variables) values
  ('notification_coursier_nouvelle_course_disponible', 'push', 'Nouvelle course recommandée (in-app)',
   E'Une nouvelle course près de vous pourrait vous intéresser : {{numero_commande}}.',
   array['numero_commande'])
on conflict (code) do nothing;
