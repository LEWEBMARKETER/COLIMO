import type {
  ActiviteCommerce,
  CategorieColis,
  CodePromo,
  Commercant,
  Coursier,
  Course,
  CourseStatus,
  Litige,
  LitigeMotif,
  Message,
  ModePaiement,
  Notation,
  PieceIdentiteType,
  QuiPaie,
  TailleColis,
  TypeClient,
  TypeReductionPromo,
  Utilisateur,
  UserType,
  VehiculeType,
  VerificationStatus,
  VolumeLivraisons,
  Zone,
} from "../types";

export interface UtilisateurRow {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
  type: UserType;
  type_client: TypeClient | null;
  photo_url: string | null;
  zone: Zone | null;
  statut: string;
  created_at: string;
}

export interface CoursierRow {
  id: string;
  utilisateur_id: string;
  documents: string[];
  type_piece_identite: PieceIdentiteType | null;
  piece_identite_url: string | null;
  type_vehicule: VehiculeType;
  statut_verification: VerificationStatus;
  disponibilite: boolean;
  note_moyenne: number;
  zones_couvertes: Zone[];
}

export interface CourseRow {
  id: string;
  numero_commande: string;
  client_id: string;
  coursier_id: string | null;
  adresse_depart: string;
  adresse_arrivee: string;
  latitude_depart: number | null;
  longitude_depart: number | null;
  latitude_arrivee: number | null;
  longitude_arrivee: number | null;
  zone_depart: Zone;
  zone_arrivee: Zone;
  type_colis: string;
  categorie_colis: CategorieColis;
  livraison_prioritaire: boolean;
  mode_paiement: ModePaiement;
  valeur_declaree: number | null;
  prix: number;
  statut: CourseStatus;
  code_promo_id: string | null;
  reduction_promo: number;
  frais_retour: number | null;
  commission: number;
  telephone_destinataire: string | null;
  nom_destinataire: string | null;
  nom_expediteur: string | null;
  telephone_expediteur: string | null;
  repere_depart: string | null;
  repere_arrivee: string | null;
  taille_colis: TailleColis | null;
  qui_paie: QuiPaie;
  instructions: string | null;
  poids_estime: number | null;
  programmee_pour: string | null;
  acceptee_at: string | null;
  recuperee_at: string | null;
  livree_at: string | null;
  confirmee_at: string | null;
  annulee_at: string | null;
  created_at: string;
}

export interface CommercantRow {
  id: string;
  utilisateur_id: string;
  adresse: string | null;
  responsable: string | null;
  horaires: string | null;
  commission_taux: number;
  activite: ActiviteCommerce | null;
  volume_quotidien: VolumeLivraisons | null;
  whatsapp: string | null;
  photo_commerce_url: string | null;
  created_at: string;
}

export interface CodePromoRow {
  id: string;
  code: string;
  type_reduction: TypeReductionPromo;
  valeur: number;
  actif: boolean;
  date_debut: string | null;
  date_fin: string | null;
  usage_max: number | null;
  usage_actuel: number;
  created_at: string;
}

export interface LitigeRow {
  id: string;
  course_id: string;
  auteur_id: string;
  motif: LitigeMotif;
  commentaire: string | null;
  preuve_urls: string[];
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

export interface MessageRow {
  id: string;
  course_id: string;
  auteur_id: string;
  contenu: string;
  created_at: string;
}

export function utilisateurFromRow(row: UtilisateurRow): Utilisateur {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    telephone: row.telephone,
    type: row.type,
    typeClient: row.type_client,
    photoUrl: row.photo_url,
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
    typePieceIdentite: row.type_piece_identite,
    pieceIdentiteUrl: row.piece_identite_url,
    typeVehicule: row.type_vehicule,
    statutVerification: row.statut_verification,
    disponibilite: row.disponibilite,
    noteMoyenne: row.note_moyenne,
    zonesCouvertes: row.zones_couvertes ?? [],
  };
}

export function courseFromRow(row: CourseRow): Course {
  return {
    id: row.id,
    numeroCommande: row.numero_commande,
    clientId: row.client_id,
    coursierId: row.coursier_id,
    adresseDepart: row.adresse_depart,
    adresseArrivee: row.adresse_arrivee,
    latitudeDepart: row.latitude_depart ?? undefined,
    longitudeDepart: row.longitude_depart ?? undefined,
    latitudeArrivee: row.latitude_arrivee ?? undefined,
    longitudeArrivee: row.longitude_arrivee ?? undefined,
    zoneDepart: row.zone_depart,
    zoneArrivee: row.zone_arrivee,
    typeColis: row.type_colis,
    categorieColis: row.categorie_colis,
    livraisonPrioritaire: row.livraison_prioritaire,
    modePaiement: row.mode_paiement,
    valeurDeclaree: row.valeur_declaree ?? undefined,
    prix: row.prix,
    statut: row.statut,
    codePromoId: row.code_promo_id ?? undefined,
    reductionPromo: row.reduction_promo,
    fraisRetour: row.frais_retour,
    commission: row.commission,
    telephoneDestinataire: row.telephone_destinataire,
    nomDestinataire: row.nom_destinataire,
    nomExpediteur: row.nom_expediteur,
    telephoneExpediteur: row.telephone_expediteur,
    repereDepart: row.repere_depart,
    repereArrivee: row.repere_arrivee,
    tailleColis: row.taille_colis,
    quiPaie: row.qui_paie,
    instructions: row.instructions,
    poidsEstime: row.poids_estime,
    programmeePour: row.programmee_pour,
    accepteeAt: row.acceptee_at,
    recupereeAt: row.recuperee_at,
    livreeAt: row.livree_at,
    confirmeeAt: row.confirmee_at,
    annuleeAt: row.annulee_at,
    createdAt: row.created_at,
  };
}

export function litigeFromRow(row: LitigeRow): Litige {
  return {
    id: row.id,
    courseId: row.course_id,
    auteurId: row.auteur_id,
    motif: row.motif,
    commentaire: row.commentaire,
    preuveUrls: row.preuve_urls ?? [],
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

export function messageFromRow(row: MessageRow): Message {
  return {
    id: row.id,
    courseId: row.course_id,
    auteurId: row.auteur_id,
    contenu: row.contenu,
    createdAt: row.created_at,
  };
}

export function commercantFromRow(row: CommercantRow): Commercant {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    adresse: row.adresse,
    responsable: row.responsable,
    horaires: row.horaires,
    commissionTaux: row.commission_taux,
    activite: row.activite,
    volumeQuotidien: row.volume_quotidien,
    whatsapp: row.whatsapp,
    photoCommerceUrl: row.photo_commerce_url,
    createdAt: row.created_at,
  };
}

export function codePromoFromRow(row: CodePromoRow): CodePromo {
  return {
    id: row.id,
    code: row.code,
    typeReduction: row.type_reduction,
    valeur: row.valeur,
    actif: row.actif,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    usageMax: row.usage_max,
    usageActuel: row.usage_actuel,
    createdAt: row.created_at,
  };
}
