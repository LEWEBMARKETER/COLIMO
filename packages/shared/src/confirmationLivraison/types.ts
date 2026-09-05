export type StatutConfirmationClient = "en_attente" | "confirme" | "signale" | "auto_finalise";

// Vue complète — accessible uniquement au client propriétaire de la course
// et à l'admin (RLS, 0042). Le coursier n'y a jamais accès directement :
// cf. EtatConfirmationCoursier ci-dessous, qui exclut toujours codeOtp.
export interface ConfirmationLivraison {
  courseId: string;
  codeOtp: string;
  otpGenereAt: string;
  otpExpireAt: string;
  otpVerifieAt: string | null;
  otpTentatives: number;
  otpRenvois: number;
  otpDernierEnvoiAt: string;
  coursierConfirmeAt: string | null;
  clientConfirmationStatut: StatutConfirmationClient;
  clientConfirmeAt: string | null;
  preuvePhotoPath: string | null;
  preuvePhotoUrl: string | null;
  preuvePhotoUploadedAt: string | null;
  finaliseAt: string | null;
  createdAt: string;
}

// Vue réduite renvoyée au coursier par get_etat_confirmation_coursier —
// jamais le code lui-même.
export interface EtatConfirmationCoursier {
  otpVerifie: boolean;
  otpTentatives: number;
  otpTentativesMax: number;
  coursierConfirmeAt: string | null;
  clientConfirmationStatut: StatutConfirmationClient;
  preuvePhotoUploadedAt: string | null;
}

export interface ConfigurationConfirmationLivraison {
  otpLongueur: 4 | 6;
  otpValiditeMinutes: number;
  otpTentativesMax: number;
  otpRenvoisMax: number;
  delaiAutoFinalisationMinutes: number;
  misAJourParId: string | null;
  misAJourAt: string;
}

export interface ResultatVerificationOtp {
  valide: boolean;
  dejaVerifie?: boolean;
  erreur?: "trop_de_tentatives" | "expire" | "code_incorrect";
  tentativesRestantes?: number;
}

export type EvenementConfirmationLivraison =
  | "otp_genere"
  | "otp_renvoye"
  | "otp_echec"
  | "otp_verifie"
  | "photo_ajoutee"
  | "coursier_confirme"
  | "client_confirme"
  | "client_signale"
  | "livraison_finalisee"
  | "auto_finalisee";

export interface HistoriqueConfirmationLivraison {
  id: string;
  courseId: string;
  evenement: EvenementConfirmationLivraison;
  utilisateurId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
