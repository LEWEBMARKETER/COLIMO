import type { CategorieColis, CourseStatus } from "../types";

// Vue réduite d'une course, exposée sans authentification au destinataire
// du colis via un jeton imprévisible (courses.token_suivi) — jamais le prix,
// le mode de paiement, la commission ni la réduction promo : non pertinents
// pour un tiers non authentifié, et jamais transmis par la fonction RPC
// (pas seulement masqués côté écran).
export interface CourseSuiviPublic {
  id: string;
  numeroCommande: string;
  statut: CourseStatus;
  typeColis: string;
  categorieColis: CategorieColis;
  adresseDepart: string;
  adresseArrivee: string;
  repereDepart: string | null;
  repereArrivee: string | null;
  latitudeDepart: number | null;
  longitudeDepart: number | null;
  latitudeArrivee: number | null;
  longitudeArrivee: number | null;
  nomExpediteur: string | null;
  telephoneExpediteur: string | null;
  nomDestinataire: string | null;
  telephoneDestinataire: string | null;
  instructions: string | null;
  programmeePour: string | null;
  coursierId: string | null;
  coursierNom: string | null;
  coursierPrenom: string | null;
  coursierTelephone: string | null;
  coursierNote: number | null;
  // Uniquement renseigné pendant une course active (acceptee/retrait/
  // en_cours) — cf. get_course_suivi_public (0038).
  coursierLatitude: number | null;
  coursierLongitude: number | null;
  coursierPositionMajAt: string | null;
  distanceRestanteM: number | null;
  etaSecondes: number | null;
  accepteeAt: string | null;
  recupereeAt: string | null;
  livreeAt: string | null;
  confirmeeAt: string | null;
  createdAt: string;
}
