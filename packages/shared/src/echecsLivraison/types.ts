export type MotifEchecLivraison =
  | "client_absent"
  | "telephone_injoignable"
  | "adresse_incorrecte"
  | "client_refuse"
  | "probleme_colis"
  | "autre";

export const MOTIF_ECHEC_LIVRAISON_LABELS: Record<MotifEchecLivraison, string> = {
  client_absent: "Client absent",
  telephone_injoignable: "Téléphone injoignable",
  adresse_incorrecte: "Adresse incorrecte",
  client_refuse: "Le client refuse la livraison",
  probleme_colis: "Problème avec le colis",
  autre: "Autre",
};

export type DecisionEchecLivraison = "nouvelle_tentative" | "retour";

export const DECISION_ECHEC_LIVRAISON_LABELS: Record<DecisionEchecLivraison, string> = {
  nouvelle_tentative: "Programmer une nouvelle tentative",
  retour: "Retourner le colis au commerçant",
};

export interface EchecLivraison {
  id: string;
  courseId: string;
  numeroTentative: number;
  motif: MotifEchecLivraison;
  commentaire: string | null;
  coursierId: string;
  decision: DecisionEchecLivraison | null;
  decideParId: string | null;
  decideAt: string | null;
  nouvelleDatePrevue: string | null;
  createdAt: string;
}
