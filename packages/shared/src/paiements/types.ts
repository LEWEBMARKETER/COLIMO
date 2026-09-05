import type { PaymentOperator } from "../types";

export type StatutPaiementManuel =
  | "en_attente_paiement"
  | "paiement_declare"
  | "en_attente_validation"
  | "paiement_confirme"
  | "paiement_rejete";

export const STATUT_PAIEMENT_LABELS: Record<StatutPaiementManuel, string> = {
  en_attente_paiement: "En attente de paiement",
  paiement_declare: "Paiement déclaré",
  en_attente_validation: "En attente de validation",
  paiement_confirme: "Paiement confirmé",
  paiement_rejete: "Paiement rejeté",
};

export const RESEAU_PAIEMENT_LABELS: Record<PaymentOperator, string> = {
  airtel_money: "Airtel Money",
  moov_money: "Moov Money",
};

export interface Paiement {
  id: string;
  courseId: string;
  utilisateurId: string;
  reference: string;
  montantAttendu: number;
  montantPaye: number | null;
  reseau: PaymentOperator | null;
  numeroPayeur: string | null;
  referenceTransaction: string | null;
  datePaiementDeclaree: string | null;
  captureUrl: string | null;
  statut: StatutPaiementManuel;
  valideParId: string | null;
  valideAt: string | null;
  motifRejet: string | null;
  declareAt: string | null;
  // "automatique" si confirmé par un fournisseur mobile money branché (cf.
  // packages/shared/src/paiements/providers.ts) — "manuel" (valeur par
  // défaut) tant qu'aucun fournisseur automatique n'est actif.
  transactionExterneId: string | null;
  mode: "manuel" | "automatique";
  createdAt: string;
  updatedAt: string;
}

// Bascule unique (id fixe), lisible par tout utilisateur authentifié pour
// savoir si le paiement automatique est actif, modifiable par un admin
// uniquement. Les identifiants du fournisseur lui-même ne sont jamais
// stockés ici (variables d'environnement serveur, cf. docs/PAIEMENT_AUTOMATIQUE.md).
export interface ConfigurationPaiementAutomatique {
  actif: boolean;
  fournisseur: PaymentOperator | null;
  misAJourParId: string | null;
  misAJourAt: string;
}
