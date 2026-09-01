import type { UserType, Utilisateur } from "../types";

export type ModeSuppressionCompte = "anonymisation" | "suppression_definitive";

export const MODE_SUPPRESSION_COMPTE_LABELS: Record<ModeSuppressionCompte, string> = {
  anonymisation: "Anonymisé (historique conservé)",
  suppression_definitive: "Supprimé définitivement",
};

export interface HistoriqueSuppressionCompte {
  id: string;
  utilisateurId: string;
  nomOriginal: string;
  telephoneOriginal: string;
  typeCompte: UserType;
  mode: ModeSuppressionCompte;
  administrateurId: string;
  motif: string | null;
  createdAt: string;
}

export interface ResultatSuppressionCompte {
  mode: ModeSuppressionCompte;
  utilisateur?: Utilisateur | null;
}
