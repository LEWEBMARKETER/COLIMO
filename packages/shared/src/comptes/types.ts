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
  emailOriginal: string | null;
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

// Préfixe posé par apps/admin/app/api/utilisateurs/[id]/route.ts sur le
// téléphone d'un compte anonymisé (`supprime-<uuid>`) — utilisé ici comme
// signal fiable de "ce compte a été supprimé", car statut === "desactive"
// ne l'est pas pour un coursier (désactivation manuelle par un admin,
// indépendante de toute suppression, cf. suspendreCoursier/desactiverCoursier).
export const PREFIXE_TELEPHONE_COMPTE_SUPPRIME = "supprime-";

export function estCompteSupprime(telephone: string): boolean {
  return telephone.startsWith(PREFIXE_TELEPHONE_COMPTE_SUPPRIME);
}
