// Types transverses du Communication Center — partagés par tous les canaux
// (email, SMS, WhatsApp, push). Le reste de l'application ne manipule
// jamais un fournisseur directement : uniquement ces types et l'API
// `communication.send()` (cf. service.ts).

export type CanalCommunication = "email" | "sms" | "whatsapp" | "push";

export const CANAL_COMMUNICATION_LABELS: Record<CanalCommunication, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
};

export type StatutCommunication = "en_attente" | "envoye" | "livre" | "lu" | "echec";

export const STATUT_COMMUNICATION_LABELS: Record<StatutCommunication, string> = {
  en_attente: "En attente",
  envoye: "Envoyé",
  livre: "Livré",
  lu: "Lu",
  echec: "Échec",
};
