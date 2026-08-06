// Catalogue des événements métier censés déclencher une communication.
// Chaque événement pointe vers le code d'un modèle par défaut (table
// modeles_notification, migrations 0020/0022). Le Communication Center
// écoute ces événements sans jamais dépendre des modules métier qui les
// déclenchent : c'est l'inverse — Courses, Paiements, Coursiers... importent
// ce catalogue, jamais le contraire.
//
// Certains événements sont catalogués (un modèle existe, prêt à l'emploi)
// mais pas encore déclenchés dans le code — cf. docs/COMMUNICATION_CENTER.md
// pour le détail de ce qui est réellement câblé aujourd'hui et pourquoi.
export type EvenementCommunication =
  // Authentification
  | "compte_bienvenue"
  | "email_verification_demandee"
  | "mot_de_passe_reinitialisation_demandee"
  // Livraison
  | "livraison_creee"
  | "coursier_attribue"
  | "coursier_en_route"
  | "colis_recupere"
  | "livraison_en_cours"
  | "livraison_terminee"
  | "livraison_annulee"
  // Paiement
  | "paiement_recu"
  | "paiement_confirme"
  | "paiement_rejete"
  // Commerçant
  | "commercant_compte_valide"
  | "commercant_compte_refuse"
  // Coursier
  | "coursier_compte_valide"
  | "coursier_nouvelle_course_disponible"
  // Litiges
  | "litige_ouvert"
  | "litige_resolu"
  // Notifications in-app (canal push) — variantes des événements ci-dessus,
  // déclenchées EN PLUS (jamais à la place) de l'appel WhatsApp existant,
  // ciblant cette fois le vrai compte COLIMO du participant à la course
  // (client/coursier) plutôt que le destinataire externe du colis.
  | "notification_livraison_creee"
  | "notification_coursier_attribue"
  | "notification_colis_recupere"
  | "notification_livraison_en_cours"
  | "notification_livraison_terminee"
  | "notification_livraison_annulee"
  | "notification_livraison_annulee_coursier"
  | "notification_litige_ouvert"
  | "notification_litige_resolu"
  | "notification_coursier_compte_valide";

export const EVENEMENT_MODELE_CODE: Record<EvenementCommunication, string> = {
  compte_bienvenue: "email_bienvenue",
  email_verification_demandee: "email_verification",
  mot_de_passe_reinitialisation_demandee: "email_reinitialisation_mdp",

  livraison_creee: "whatsapp_livraison_creee",
  coursier_attribue: "whatsapp_coursier_attribue",
  coursier_en_route: "whatsapp_coursier_en_route",
  colis_recupere: "whatsapp_colis_recupere",
  livraison_en_cours: "whatsapp_livraison_en_cours",
  livraison_terminee: "whatsapp_livraison_terminee",
  livraison_annulee: "whatsapp_livraison_annulee",

  paiement_recu: "whatsapp_paiement_recu",
  paiement_confirme: "whatsapp_paiement_confirme",
  paiement_rejete: "whatsapp_paiement_rejete",

  commercant_compte_valide: "whatsapp_commercant_compte_valide",
  commercant_compte_refuse: "whatsapp_commercant_compte_refuse",

  coursier_compte_valide: "whatsapp_coursier_compte_valide",
  coursier_nouvelle_course_disponible: "whatsapp_coursier_nouvelle_course_disponible",

  litige_ouvert: "whatsapp_litige_ouvert",
  litige_resolu: "whatsapp_litige_resolu",

  notification_livraison_creee: "notification_livraison_creee",
  notification_coursier_attribue: "notification_coursier_attribue",
  notification_colis_recupere: "notification_colis_recupere",
  notification_livraison_en_cours: "notification_livraison_en_cours",
  notification_livraison_terminee: "notification_livraison_terminee",
  notification_livraison_annulee: "notification_livraison_annulee",
  notification_livraison_annulee_coursier: "notification_livraison_annulee_coursier",
  notification_litige_ouvert: "notification_litige_ouvert",
  notification_litige_resolu: "notification_litige_resolu",
  notification_coursier_compte_valide: "notification_coursier_compte_valide",
};

// Canal par défaut de chaque événement — utilisé par les wrappers
// `notifierEvenement` (apps/mobile et apps/admin) pour ne pas avoir à le
// répéter à chaque appel.
export const EVENEMENT_CANAL: Record<EvenementCommunication, "email" | "sms" | "whatsapp" | "push"> = {
  compte_bienvenue: "email",
  email_verification_demandee: "email",
  mot_de_passe_reinitialisation_demandee: "email",

  livraison_creee: "whatsapp",
  coursier_attribue: "whatsapp",
  coursier_en_route: "whatsapp",
  colis_recupere: "whatsapp",
  livraison_en_cours: "whatsapp",
  livraison_terminee: "whatsapp",
  livraison_annulee: "whatsapp",

  paiement_recu: "whatsapp",
  paiement_confirme: "whatsapp",
  paiement_rejete: "whatsapp",

  commercant_compte_valide: "whatsapp",
  commercant_compte_refuse: "whatsapp",

  coursier_compte_valide: "whatsapp",
  coursier_nouvelle_course_disponible: "whatsapp",

  litige_ouvert: "whatsapp",
  litige_resolu: "whatsapp",

  notification_livraison_creee: "push",
  notification_coursier_attribue: "push",
  notification_colis_recupere: "push",
  notification_livraison_en_cours: "push",
  notification_livraison_terminee: "push",
  notification_livraison_annulee: "push",
  notification_livraison_annulee_coursier: "push",
  notification_litige_ouvert: "push",
  notification_litige_resolu: "push",
  notification_coursier_compte_valide: "push",
};
