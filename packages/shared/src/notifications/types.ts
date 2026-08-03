export type TypeNotification = "sms" | "whatsapp" | "email" | "push";

export const TYPE_NOTIFICATION_LABELS: Record<TypeNotification, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Email",
  push: "Push",
};

export type StatutNotification = "en_attente" | "envoye" | "livre" | "lu" | "echec";

export const STATUT_NOTIFICATION_LABELS: Record<StatutNotification, string> = {
  en_attente: "En attente",
  envoye: "Envoyé",
  livre: "Livré",
  lu: "Lu",
  echec: "Échec",
};

export interface ModeleNotification {
  id: string;
  code: string;
  type: TypeNotification;
  nom: string;
  sujet: string | null;
  contenu: string;
  variables: string[];
  actif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEnvoyee {
  id: string;
  utilisateurId: string | null;
  declenchePar: string;
  type: TypeNotification;
  destinataire: string;
  modeleCode: string | null;
  contenu: string;
  statut: StatutNotification;
  erreur: string | null;
  createdAt: string;
  envoyeAt: string | null;
  livreAt: string | null;
  luAt: string | null;
}
