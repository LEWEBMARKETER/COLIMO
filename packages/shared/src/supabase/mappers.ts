import type {
  Coursier,
  Course,
  CourseStatus,
  Notation,
  Utilisateur,
  UserType,
  VehiculeType,
  VerificationStatus,
  Zone,
} from "../types";

export interface UtilisateurRow {
  id: string;
  nom: string;
  telephone: string;
  type: UserType;
  zone: Zone | null;
  statut: string;
  created_at: string;
}

export interface CoursierRow {
  id: string;
  utilisateur_id: string;
  documents: string[];
  type_vehicule: VehiculeType;
  statut_verification: VerificationStatus;
  disponibilite: boolean;
  note_moyenne: number;
}

export interface CourseRow {
  id: string;
  client_id: string;
  coursier_id: string | null;
  adresse_depart: string;
  adresse_arrivee: string;
  zone_depart: Zone;
  zone_arrivee: Zone;
  type_colis: string;
  livraison_prioritaire: boolean;
  valeur_declaree: number | null;
  prix: number;
  statut: CourseStatus;
  created_at: string;
}

export interface NotationRow {
  id: string;
  course_id: string;
  auteur_id: string;
  destinataire_id: string;
  note: number;
  commentaire: string | null;
}

export function utilisateurFromRow(row: UtilisateurRow): Utilisateur {
  return {
    id: row.id,
    nom: row.nom,
    telephone: row.telephone,
    type: row.type,
    zone: row.zone,
    statut: row.statut,
    createdAt: row.created_at,
  };
}

export function coursierFromRow(row: CoursierRow): Coursier {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    documents: row.documents ?? [],
    typeVehicule: row.type_vehicule,
    statutVerification: row.statut_verification,
    disponibilite: row.disponibilite,
    noteMoyenne: row.note_moyenne,
  };
}

export function courseFromRow(row: CourseRow): Course {
  return {
    id: row.id,
    clientId: row.client_id,
    coursierId: row.coursier_id,
    adresseDepart: row.adresse_depart,
    adresseArrivee: row.adresse_arrivee,
    zoneDepart: row.zone_depart,
    zoneArrivee: row.zone_arrivee,
    typeColis: row.type_colis,
    livraisonPrioritaire: row.livraison_prioritaire,
    valeurDeclaree: row.valeur_declaree ?? undefined,
    prix: row.prix,
    statut: row.statut,
    createdAt: row.created_at,
  };
}

export function notationFromRow(row: NotationRow): Notation {
  return {
    id: row.id,
    courseId: row.course_id,
    auteurId: row.auteur_id,
    destinataireId: row.destinataire_id,
    note: row.note,
    commentaire: row.commentaire ?? undefined,
  };
}
