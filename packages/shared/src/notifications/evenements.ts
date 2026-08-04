// Catalogue des événements métier censés déclencher une notification
// automatique (WhatsApp en priorité). Chaque événement pointe vers le code
// d'un modèle par défaut (table modeles_notification, migration 0020).
//
// "coursier_en_route" est présent dans le catalogue pour préparer le futur,
// mais n'est déclenché nulle part dans le code : le pipeline de statuts
// actuel (acceptee → retrait → en_cours → livree → confirmee) n'a pas
// d'étape distincte pour "en route vers le point de récupération" par
// rapport à "coursier assigné". L'ajouter nécessiterait de complexifier le
// pipeline de statuts, ce qui n'a pas été demandé pour cette passe.
export type EvenementNotification =
  | "livraison_creee"
  | "coursier_attribue"
  | "coursier_en_route"
  | "colis_recupere"
  | "livraison_en_cours"
  | "livraison_terminee"
  | "livraison_annulee"
  | "litige_ouvert"
  | "litige_resolu"
  | "paiement_confirme"
  | "paiement_rejete";

export const EVENEMENT_MODELE_CODE: Record<EvenementNotification, string> = {
  livraison_creee: "whatsapp_livraison_creee",
  coursier_attribue: "whatsapp_coursier_attribue",
  coursier_en_route: "whatsapp_coursier_en_route",
  colis_recupere: "whatsapp_colis_recupere",
  livraison_en_cours: "whatsapp_livraison_en_cours",
  livraison_terminee: "whatsapp_livraison_terminee",
  livraison_annulee: "whatsapp_livraison_annulee",
  litige_ouvert: "whatsapp_litige_ouvert",
  litige_resolu: "whatsapp_litige_resolu",
  paiement_confirme: "whatsapp_paiement_confirme",
  paiement_rejete: "whatsapp_paiement_rejete",
};
