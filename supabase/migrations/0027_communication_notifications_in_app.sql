-- Notifications in-app (client + coursier) : le Communication Center avait
-- déjà toute la plomberie (table notifications, canal push, utilisateur_id
-- optionnel) mais personne ne la remplissait — les deux wrappers
-- notifierEvenement() ne passaient jamais utilisateur_id. Cette migration
-- corrige les deux failles RLS qui empêchaient un utilisateur de lire (et
-- de marquer comme lues) ses propres notifications, active le Realtime
-- pour un badge de compteur en direct, et seed les modèles des nouveaux
-- événements "push" ciblant le client/coursier lui-même plutôt que le
-- destinataire externe du colis.

-- notifications_select_admin autorisait uniquement l'admin ou celui qui a
-- déclenché l'envoi (declenche_par) à lire une ligne — jamais le
-- destinataire réel (utilisateur_id). Sans ce correctif, l'inbox in-app ne
-- peut rien afficher : la session du client/coursier n'a le droit de lire
-- aucune de ses propres notifications.
drop policy if exists "notifications_select_admin" on notifications;
create policy "notifications_select_own_or_admin"
  on notifications for select
  using (current_user_type() = 'admin' or declenche_par = auth.uid() or utilisateur_id = auth.uid());

-- Même lacune pour "marquer comme lu" : le lecteur n'est presque jamais
-- declenche_par (souvent un admin, ou un autre utilisateur — ex. le client
-- qui crée la course déclenche la notification que reçoit le coursier).
drop policy if exists "notifications_update_own_or_admin" on notifications;
create policy "notifications_update_own_or_admin"
  on notifications for update
  using (declenche_par = auth.uid() or utilisateur_id = auth.uid() or current_user_type() = 'admin')
  with check (declenche_par = auth.uid() or utilisateur_id = auth.uid() or current_user_type() = 'admin');

-- Badge de compteur en direct côté app (même mécanisme que la table
-- messages, migration 0006).
alter publication supabase_realtime add table notifications;

insert into modeles_notification (code, type, nom, contenu, variables) values
  ('notification_livraison_creee', 'push', 'Livraison créée (in-app)',
   E'Votre livraison {{numero_commande}} a été enregistrée.',
   array['numero_commande']),
  ('notification_coursier_attribue', 'push', 'Coursier attribué (in-app)',
   E'{{nom_coursier}} a été assigné à votre livraison {{numero_commande}}.',
   array['nom_coursier', 'numero_commande']),
  ('notification_colis_recupere', 'push', 'Colis récupéré (in-app)',
   E'Votre colis ({{numero_commande}}) a été récupéré et est en route.',
   array['numero_commande']),
  ('notification_livraison_en_cours', 'push', 'Livraison en cours (in-app)',
   E'Votre colis ({{numero_commande}}) est en cours de livraison.',
   array['numero_commande']),
  ('notification_livraison_terminee', 'push', 'Livraison terminée (in-app)',
   E'La livraison {{numero_commande}} a été confirmée. Merci d''avoir utilisé COLIMO !',
   array['numero_commande']),
  ('notification_livraison_annulee', 'push', 'Livraison annulée (in-app)',
   E'La livraison {{numero_commande}} a été annulée.',
   array['numero_commande']),
  ('notification_litige_ouvert', 'push', 'Litige ouvert (in-app)',
   E'Un litige a été signalé concernant la commande {{numero_commande}}. Notre équipe l''examine.',
   array['numero_commande']),
  ('notification_litige_resolu', 'push', 'Litige résolu (in-app)',
   E'Le litige concernant la commande {{numero_commande}} a été résolu : {{resolution}}.',
   array['numero_commande', 'resolution']),
  ('notification_coursier_compte_valide', 'push', 'Compte coursier validé (in-app)',
   E'Félicitations {{prenom}}, votre compte COLIMO a été validé. Vous pouvez désormais accepter des courses.',
   array['prenom'])
on conflict (code) do nothing;
