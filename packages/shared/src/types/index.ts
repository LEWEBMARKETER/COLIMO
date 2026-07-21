export type UserType = "client" | "coursier" | "admin";

export type Zone = "libreville" | "akanda" | "owendo" | "bikele_essassa" | "ntoum";

export const ZONE_LABELS: Record<Zone, string> = {
  libreville: "Libreville",
  akanda: "Akanda",
  owendo: "Owendo",
  bikele_essassa: "Bikélé-Essassa",
  ntoum: "Ntoum",
};

export type VehiculeType = "moto" | "velo" | "voiture" | "pied";

export type VerificationStatus = "en_attente" | "valide" | "rejete";

export type CourseStatus =
  | "en_attente"
  | "acceptee"
  | "en_cours"
  | "livree"
  | "confirmee"
  | "annulee"
  | "litige";

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  en_cours: "En cours",
  livree: "Livrée",
  confirmee: "Confirmée",
  annulee: "Annulée",
  litige: "Litige",
};

export type PaymentOperator = "airtel_money" | "moov_money";

export type PaymentStatus = "en_attente" | "reussi" | "echoue" | "rembourse";

export interface Utilisateur {
  id: string;
  nom: string;
  telephone: string;
  type: UserType;
  zone: Zone | null;
  statut: string;
  createdAt: string;
}

export interface Coursier {
  id: string;
  utilisateurId: string;
  documents: string[];
  typeVehicule: VehiculeType;
  statutVerification: VerificationStatus;
  disponibilite: boolean;
  noteMoyenne: number;
}

export interface Course {
  id: string;
  clientId: string;
  coursierId: string | null;
  adresseDepart: string;
  adresseArrivee: string;
  zoneDepart: Zone;
  zoneArrivee: Zone;
  typeColis: string;
  livraisonPrioritaire: boolean;
  valeurDeclaree?: number;
  prix: number;
  statut: CourseStatus;
  createdAt: string;
}

export interface Transaction {
  id: string;
  courseId: string;
  montant: number;
  commissionPlateforme: number;
  operateur: PaymentOperator;
  reference: string;
  statutPaiement: PaymentStatus;
}

export interface Notation {
  id: string;
  courseId: string;
  auteurId: string;
  destinataireId: string;
  note: number;
  commentaire?: string;
}
