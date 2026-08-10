import type { PackPayant } from "../types";

export type StatutDemandeAbonnement =
  | "demande_envoyee"
  | "en_attente_paiement"
  | "paiement_a_confirmer"
  | "activation_en_cours"
  | "active"
  | "refuse"
  | "expire";

export const STATUT_DEMANDE_ABONNEMENT_LABELS: Record<StatutDemandeAbonnement, string> = {
  demande_envoyee: "Demande envoyée",
  en_attente_paiement: "En attente de paiement",
  paiement_a_confirmer: "Paiement à confirmer",
  activation_en_cours: "Activation en cours",
  active: "Activé",
  refuse: "Refusé",
  expire: "Expiré",
};

export interface DemandeAbonnement {
  id: string;
  commerceId: string;
  utilisateurId: string;
  packDemande: PackPayant;
  statut: StatutDemandeAbonnement;
  createdAt: string;
  updatedAt: string;
}
