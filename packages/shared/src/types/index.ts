export type UserType = "client" | "coursier" | "admin";

export type Zone = "libreville" | "akanda" | "owendo" | "bikele_essassa" | "ntoum" | "pk12";

export const ZONE_LABELS: Record<Zone, string> = {
  libreville: "Libreville",
  akanda: "Akanda",
  owendo: "Owendo",
  bikele_essassa: "Bikélé-Essassa",
  ntoum: "Ntoum",
  pk12: "PK12",
};

export type VehiculeType = "moto" | "velo" | "voiture" | "pied";

export type VerificationStatus = "en_attente" | "valide" | "rejete";

export type CourseStatus =
  | "en_attente"
  | "acceptee"
  | "retrait"
  | "en_cours"
  | "livree"
  | "confirmee"
  | "annulee"
  | "litige"
  | "retournee";

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  en_attente: "En attente",
  acceptee: "Acceptée",
  retrait: "En cours de retrait",
  en_cours: "En cours de livraison",
  livree: "Livrée",
  confirmee: "Confirmée",
  annulee: "Annulée",
  litige: "Litige",
  retournee: "Colis retourné",
};

export type PaymentOperator = "airtel_money" | "moov_money";

export type PaymentStatus = "en_attente" | "reussi" | "echoue" | "rembourse";

export type TypeClient = "particulier" | "commerce";

export type PieceIdentiteType = "cni" | "passeport" | "carte_sejour" | "permis_conduire";

export const PIECE_IDENTITE_LABELS: Record<PieceIdentiteType, string> = {
  cni: "Carte nationale d'identité",
  passeport: "Passeport",
  carte_sejour: "Carte de séjour",
  permis_conduire: "Permis de conduire",
};

export type CategorieColis =
  | "repas"
  | "courses_alimentaires"
  | "documents"
  | "articles"
  | "electromenager"
  | "autres";

export const CATEGORIE_COLIS_LABELS: Record<CategorieColis, string> = {
  repas: "Repas",
  courses_alimentaires: "Courses alimentaires",
  documents: "Documents",
  articles: "Articles",
  electromenager: "Électroménager",
  autres: "Autres",
};

export type ModePaiement = "mobile_money" | "especes";

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  mobile_money: "Mobile Money",
  especes: "Espèces à la livraison",
};

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  type: UserType;
  typeClient: TypeClient | null;
  photoUrl: string | null;
  zone: Zone | null;
  statut: string;
  createdAt: string;
}

export interface Coursier {
  id: string;
  utilisateurId: string;
  documents: string[];
  typePieceIdentite: PieceIdentiteType | null;
  pieceIdentiteUrl: string | null;
  typeVehicule: VehiculeType;
  statutVerification: VerificationStatus;
  disponibilite: boolean;
  noteMoyenne: number;
  zonesCouvertes: Zone[];
}

export interface Commercant {
  id: string;
  utilisateurId: string;
  adresse: string | null;
  responsable: string | null;
  horaires: string | null;
  commissionTaux: number;
  createdAt: string;
}

export type TypeReductionPromo = "pourcentage" | "montant_fixe";

export interface CodePromo {
  id: string;
  code: string;
  typeReduction: TypeReductionPromo;
  valeur: number;
  actif: boolean;
  dateDebut: string | null;
  dateFin: string | null;
  usageMax: number | null;
  usageActuel: number;
  createdAt: string;
}

export interface Course {
  id: string;
  numeroCommande: string;
  clientId: string;
  coursierId: string | null;
  adresseDepart: string;
  adresseArrivee: string;
  latitudeDepart?: number;
  longitudeDepart?: number;
  latitudeArrivee?: number;
  longitudeArrivee?: number;
  zoneDepart: Zone;
  zoneArrivee: Zone;
  typeColis: string;
  categorieColis: CategorieColis;
  livraisonPrioritaire: boolean;
  modePaiement: ModePaiement;
  valeurDeclaree?: number;
  prix: number;
  statut: CourseStatus;
  codePromoId?: string;
  reductionPromo: number;
  fraisRetour: number | null;
  commission: number;
  createdAt: string;
}

export type LitigeMotif =
  | "produit_manquant"
  | "produit_endommage"
  | "erreur_commande"
  | "retard_important"
  | "comportement_inapproprie"
  | "colis_non_recu"
  | "autre";

export const LITIGE_MOTIF_LABELS: Record<LitigeMotif, string> = {
  produit_manquant: "Produit manquant",
  produit_endommage: "Produit endommagé",
  erreur_commande: "Erreur de commande",
  retard_important: "Retard important",
  comportement_inapproprie: "Comportement inapproprié",
  colis_non_recu: "Colis non reçu",
  autre: "Autre",
};

export interface Litige {
  id: string;
  courseId: string;
  auteurId: string;
  motif: LitigeMotif;
  commentaire: string | null;
  preuveUrls: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  courseId: string;
  auteurId: string;
  contenu: string;
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
