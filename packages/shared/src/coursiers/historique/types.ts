export type ActionHistoriqueCoursier =
  | "changement_statut"
  | "attribution_badge"
  | "retrait_badge"
  | "changement_niveau"
  | "commentaire_interne"
  | "validation_dossier"
  | "rejet_dossier"
  | "suspension"
  | "reactivation"
  | "desactivation";

export const ACTION_HISTORIQUE_COURSIER_LABELS: Record<ActionHistoriqueCoursier, string> = {
  changement_statut: "Changement de statut",
  attribution_badge: "Badge attribué",
  retrait_badge: "Badge retiré",
  changement_niveau: "Changement de niveau",
  commentaire_interne: "Commentaire interne",
  validation_dossier: "Dossier validé",
  rejet_dossier: "Dossier rejeté",
  suspension: "Suspension",
  reactivation: "Réactivation",
  desactivation: "Désactivation",
};

export interface HistoriqueCoursier {
  id: string;
  coursierId: string;
  action: ActionHistoriqueCoursier;
  ancienneValeur: string | null;
  nouvelleValeur: string | null;
  motif: string | null;
  commentaire: string | null;
  administrateurId: string | null;
  createdAt: string;
}
