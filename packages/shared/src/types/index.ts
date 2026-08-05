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

// Statut opérationnel canonique du coursier (module Coursiers). Stocké en
// base sur 6 valeurs seulement — "occupe" n'existe pas en base, c'est un
// état dérivé (le coursier a une course active), calculé côté application
// par calculerStatutEffectif (packages/shared/src/coursiers/statuts).
export type StatutCoursier = "en_attente_validation" | "verifie" | "en_ligne" | "hors_ligne" | "suspendu" | "desactive";

// Statut "effectif" affiché à l'admin : ajoute "occupe" (dérivé) à
// StatutCoursier — jamais persisté, cf. calculerStatutEffectif.
export type StatutCoursierEffectif = StatutCoursier | "occupe";

export const STATUT_COURSIER_LABELS: Record<StatutCoursierEffectif, string> = {
  en_attente_validation: "En attente de validation",
  verifie: "Vérifié",
  en_ligne: "En ligne",
  occupe: "Occupé",
  hors_ligne: "Hors ligne",
  suspendu: "Suspendu",
  desactive: "Désactivé",
};

export type CourseStatus =
  | "en_attente_paiement"
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
  en_attente_paiement: "En attente de paiement",
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
  | "vetement"
  | "medicament"
  | "articles"
  | "electromenager"
  | "autres";

export const CATEGORIE_COLIS_LABELS: Record<CategorieColis, string> = {
  repas: "Repas",
  courses_alimentaires: "Courses alimentaires",
  documents: "Document",
  vetement: "Vêtement",
  medicament: "Médicament",
  articles: "Articles",
  electromenager: "Électroménager",
  autres: "Autre",
};

export const CATEGORIE_COLIS_EMOJIS: Record<CategorieColis, string> = {
  repas: "🍰",
  courses_alimentaires: "🛒",
  documents: "📄",
  vetement: "👕",
  medicament: "💊",
  articles: "🎁",
  electromenager: "🔌",
  autres: "🛍️",
};

export type TailleColis = "petit" | "moyen" | "grand";

export const TAILLE_COLIS_LABELS: Record<TailleColis, string> = {
  petit: "Petit",
  moyen: "Moyen",
  grand: "Grand",
};

export type QuiPaie = "expediteur" | "destinataire";

export const QUI_PAIE_LABELS: Record<QuiPaie, string> = {
  expediteur: "Expéditeur",
  destinataire: "Destinataire",
};

export type ModePaiement = "mobile_money" | "especes" | "deja_paye";

export const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  mobile_money: "Mobile Money",
  especes: "Espèces à la livraison",
  deja_paye: "Déjà payé (par le client au commerce)",
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
  statut: StatutCoursier;
  niveauId: string | null;
  nombreLivraisons: number;
  nombreCoursesAssignees: number;
  nombreCoursesAnnulees: number;
  dureeLivraisonTotaleSecondes: number;
}

export type ActiviteCommerce =
  | "restaurant"
  | "pharmacie"
  | "boutique"
  | "ecommerce"
  | "fleuriste"
  | "patisserie"
  | "librairie"
  | "autre";

export const ACTIVITE_COMMERCE_LABELS: Record<ActiviteCommerce, string> = {
  restaurant: "Restaurant",
  pharmacie: "Pharmacie",
  boutique: "Boutique",
  ecommerce: "E-commerce",
  fleuriste: "Fleuriste",
  patisserie: "Pâtisserie",
  librairie: "Librairie",
  autre: "Autre",
};

export type VolumeLivraisons = "un_a_cinq" | "cinq_a_dix" | "dix_a_vingt" | "plus_de_vingt";

export const VOLUME_LIVRAISONS_LABELS: Record<VolumeLivraisons, string> = {
  un_a_cinq: "1 à 5 par jour",
  cinq_a_dix: "5 à 10 par jour",
  dix_a_vingt: "10 à 20 par jour",
  plus_de_vingt: "Plus de 20 par jour",
};

export interface Commercant {
  id: string;
  utilisateurId: string;
  adresse: string | null;
  responsable: string | null;
  horaires: string | null;
  commissionTaux: number;
  activite: ActiviteCommerce | null;
  volumeQuotidien: VolumeLivraisons | null;
  whatsapp: string | null;
  photoCommerceUrl: string | null;
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
  telephoneDestinataire: string | null;
  nomDestinataire: string | null;
  nomExpediteur: string | null;
  telephoneExpediteur: string | null;
  repereDepart: string | null;
  repereArrivee: string | null;
  tailleColis: TailleColis | null;
  quiPaie: QuiPaie;
  instructions: string | null;
  poidsEstime: number | null;
  programmeePour: string | null;
  accepteeAt: string | null;
  recupereeAt: string | null;
  livreeAt: string | null;
  confirmeeAt: string | null;
  annuleeAt: string | null;
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
