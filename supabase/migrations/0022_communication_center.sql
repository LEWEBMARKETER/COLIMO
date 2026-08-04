-- Communication Center : nouveaux modèles couvrant l'authentification (email)
-- et les statuts commerçant/coursier restant à cataloguer. Les tables et
-- types restent ceux du module notifications (modeles_notification,
-- notifications, type_notification, statut_notification) — seul le code
-- TypeScript a été renommé en "Communication Center"
-- (cf. packages/shared/src/communication). Aucune migration de schéma
-- n'est nécessaire pour ce renommage côté code.

insert into modeles_notification (code, type, nom, sujet, contenu, variables) values
  ('email_bienvenue', 'email', 'Bienvenue', 'Bienvenue sur COLIMO',
   E'Bonjour {{prenom}},\n\nBienvenue sur COLIMO ! Votre compte a bien été créé.\n\nÀ très vite,\nL''équipe COLIMO',
   array['prenom']),
  ('email_verification', 'email', 'Vérification Email', 'Vérifiez votre adresse email',
   E'Bonjour {{prenom}},\n\nMerci de confirmer votre adresse email en cliquant sur le lien ci-dessous :\n{{lien}}\n\nSi vous n''êtes pas à l''origine de cette demande, ignorez ce message.',
   array['prenom', 'lien']),
  ('email_reinitialisation_mdp', 'email', 'Réinitialisation mot de passe', 'Réinitialisation de votre mot de passe',
   E'Bonjour {{prenom}},\n\nVous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour en choisir un nouveau :\n{{lien}}\n\nSi vous n''êtes pas à l''origine de cette demande, ignorez ce message.',
   array['prenom', 'lien']),
  ('whatsapp_paiement_recu', 'whatsapp', 'Paiement reçu', null,
   E'Bonjour {{nom_client}},\n\nNous avons bien reçu votre déclaration de paiement pour la commande {{numero_commande}}. Elle est en cours de vérification.',
   array['nom_client', 'numero_commande']),
  ('whatsapp_commercant_compte_valide', 'whatsapp', 'Compte commerçant validé', null,
   E'Bonjour {{nom_commercant}},\n\nVotre compte commerçant COLIMO a été validé. Vous pouvez dès à présent publier des livraisons.',
   array['nom_commercant']),
  ('whatsapp_commercant_compte_refuse', 'whatsapp', 'Compte commerçant refusé', null,
   E'Bonjour {{nom_commercant}},\n\nVotre demande de compte commerçant COLIMO n''a pas pu être validée. Motif : {{motif}}.',
   array['nom_commercant', 'motif']),
  ('whatsapp_coursier_compte_valide', 'whatsapp', 'Compte coursier validé', null,
   E'Bonjour {{prenom}},\n\nFélicitations, votre compte coursier COLIMO a été validé. Vous pouvez désormais accepter des courses.',
   array['prenom']),
  ('whatsapp_coursier_nouvelle_course_disponible', 'whatsapp', 'Nouvelle course disponible', null,
   E'Bonjour {{prenom}},\n\nUne nouvelle course est disponible près de vous : {{numero_commande}}.',
   array['prenom', 'numero_commande'])
on conflict (code) do nothing;
