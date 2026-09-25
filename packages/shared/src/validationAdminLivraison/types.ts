import type { CourseStatus } from "../types";

// Validation administrative finale d'une course — solution de secours quand
// ni le client ni le coursier n'a effectué la confirmation finale (cf.
// confirmationLivraison/, le mécanisme normal). Aucun statut dédié : le
// besoin "Livraison à confirmer" est le statut "livree" existant, et
// "Livraison confirmée" est "confirmee" existant.

export type MethodeVerificationLivraison =
  | "client_contacte"
  | "coursier_contacte"
  | "client_et_coursier_contactes"
  | "preuve_verifiee"
  | "autre";

export const METHODE_VERIFICATION_LIVRAISON_LABELS: Record<MethodeVerificationLivraison, string> = {
  client_contacte: "Client contacté",
  coursier_contacte: "Coursier contacté",
  client_et_coursier_contactes: "Client et coursier contactés",
  preuve_verifiee: "Preuve de livraison vérifiée",
  autre: "Autre",
};

export type ResultatVerificationLivraison = "confirmee" | "contestee" | "impossible";

export const RESULTAT_VERIFICATION_LIVRAISON_LABELS: Record<ResultatVerificationLivraison, string> = {
  confirmee: "Livraison confirmée",
  contestee: "Livraison contestée",
  impossible: "Vérification impossible",
};

export interface ValidationAdminLivraison {
  id: string;
  courseId: string;
  ancienStatut: CourseStatus;
  nouveauStatut: CourseStatus;
  administrateurId: string;
  methodeVerification: MethodeVerificationLivraison;
  resultat: ResultatVerificationLivraison;
  note: string | null;
  source: "admin";
  createdAt: string;
}
