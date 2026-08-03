// Module OTP indépendant — architecture prête pour une activation future.
// L'authentification actuelle (email + mot de passe) ne l'utilise pas.
export type ObjectifOtp =
  | "verification_telephone"
  | "reinitialisation_mdp"
  | "double_authentification"
  | "validation_commercant"
  | "validation_coursier";

export const OBJECTIF_OTP_LABELS: Record<ObjectifOtp, string> = {
  verification_telephone: "Vérification du numéro de téléphone",
  reinitialisation_mdp: "Réinitialisation du mot de passe",
  double_authentification: "Double authentification",
  validation_commercant: "Validation des commerçants",
  validation_coursier: "Validation des coursiers",
};

export interface CodeOtp {
  id: string;
  utilisateurId: string | null;
  destinataire: string;
  objectif: ObjectifOtp;
  expireAt: string;
  utilise: boolean;
  createdAt: string;
}
