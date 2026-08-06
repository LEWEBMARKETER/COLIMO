import type { CourseStatus } from "../types";

export type MotifAnnulationClient =
  | "coursier_demande"
  | "attente_trop_longue"
  | "plus_besoin"
  | "erreur_informations"
  | "mauvaise_adresse"
  | "destinataire_indisponible"
  | "colis_non_pret"
  | "erreur_creation"
  | "autre";

export const MOTIF_ANNULATION_CLIENT_LABELS: Record<MotifAnnulationClient, string> = {
  coursier_demande: "Le coursier me l'a demandé",
  attente_trop_longue: "Temps d'attente trop long",
  plus_besoin: "Je n'ai plus besoin de cette livraison",
  erreur_informations: "Erreur dans les informations de livraison",
  mauvaise_adresse: "Mauvaise adresse",
  destinataire_indisponible: "Le destinataire n'est plus disponible",
  colis_non_pret: "Le colis n'est plus prêt",
  erreur_creation: "J'ai créé la course par erreur",
  autre: "Autre",
};

export type MotifAnnulationAdmin =
  | "litige_confirme"
  | "erreur_systeme"
  | "incident_livraison"
  | "demande_exceptionnelle"
  | "fraude"
  | "force_majeure"
  | "autre";

export const MOTIF_ANNULATION_ADMIN_LABELS: Record<MotifAnnulationAdmin, string> = {
  litige_confirme: "Litige confirmé",
  erreur_systeme: "Erreur système",
  incident_livraison: "Incident de livraison",
  demande_exceptionnelle: "Demande exceptionnelle",
  fraude: "Fraude",
  force_majeure: "Force majeure",
  autre: "Autre",
};

export type RoleAnnulation = "client_particulier" | "client_commerce" | "admin";

export const ROLE_ANNULATION_LABELS: Record<RoleAnnulation, string> = {
  client_particulier: "Client",
  client_commerce: "Commerce",
  admin: "Administrateur",
};

export interface HistoriqueAnnulation {
  id: string;
  courseId: string;
  utilisateurId: string;
  role: RoleAnnulation;
  motif: string;
  commentaire: string | null;
  statutPrecedent: CourseStatus;
  nouveauStatut: CourseStatus;
  createdAt: string;
}
