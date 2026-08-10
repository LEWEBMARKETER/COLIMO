export type ActionHistoriqueAbonnement =
  | "activation"
  | "renouvellement"
  | "desactivation"
  | "suspension"
  | "reactivation"
  | "expiration"
  | "refus";

export const ACTION_HISTORIQUE_ABONNEMENT_LABELS: Record<ActionHistoriqueAbonnement, string> = {
  activation: "Activation",
  renouvellement: "Renouvellement",
  desactivation: "Désactivation",
  suspension: "Suspension",
  reactivation: "Réactivation",
  expiration: "Expiration",
  refus: "Refus de demande",
};

export interface HistoriqueAbonnement {
  id: string;
  commerceId: string;
  administrateurId: string | null;
  action: ActionHistoriqueAbonnement;
  ancienForfait: string | null;
  nouveauForfait: string | null;
  dateExpiration: string | null;
  motif: string | null;
  commentaire: string | null;
  createdAt: string;
}
