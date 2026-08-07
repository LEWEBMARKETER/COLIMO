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
  PaymentOperator,
  PieceIdentiteType,
  QuiPaie,
  ResolutionLitige,
  StatutCoursier,
  SubscriptionPlan,
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
import type { CanalCommunication, StatutCommunication } from "../communication/types";
import type { ModeleCommunication } from "../communication/templates/types";
import type { CommunicationEnvoyee } from "../communication/history/types";
import type { CodeOtp, ObjectifOtp } from "../otp/types";
import type { Paiement, StatutPaiementManuel } from "../paiements/types";
import type { BadgeCoursier, BadgeCoursierAttribue, ModeAttributionBadge, RegleBadge } from "../coursiers/badges/types";
import type { NiveauCoursier } from "../coursiers/niveaux/types";
import type { ActionHistoriqueCoursier, HistoriqueCoursier } from "../coursiers/historique/types";
import type { HistoriqueAnnulation, RoleAnnulation } from "../annulations/types";
import type { PackPayant } from "../abonnements/types";
import type { StatutDemandeAbonnement, DemandeAbonnement } from "../abonnements/demandes/types";
import type { ActionHistoriqueAbonnement, HistoriqueAbonnement } from "../abonnements/historique/types";
import type { RoleCommerceMembre, CommerceMembre, InvitationCommerce } from "../abonnements/equipe/types";
import type { CommerceDestinataire } from "../abonnements/destinataires/types";
import type { CommerceAdresseFavorite, CommercePointDepart } from "../abonnements/adresses/types";
import type { CommerceCoursierFavori } from "../abonnements/coursiers-favoris/types";
import type { ConfigurationPaiementAbonnement } from "../abonnements/paiement/types";

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
  statut: StatutCoursier;
  niveau_id: string | null;
  nombre_livraisons: number;
  nombre_courses_assignees: number;
  nombre_courses_annulees: number;
  duree_livraison_totale_secondes: number;
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
  destinataire_carnet_id: string | null;
  point_depart_id: string | null;
  acceptee_at: string | null;
  recuperee_at: string | null;
  livree_at: string | null;
  confirmee_at: string | null;
  annulee_at: string | null;
  annulee_par: string | null;
  motif_annulation: string | null;
  commentaire_annulation: string | null;
  statut_avant_litige: CourseStatus | null;
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
  subscription_plan: SubscriptionPlan;
  abonnement_debute_le: string | null;
  abonnement_expire_le: string | null;
  abonnement_suspendu: boolean;
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
  resolution: ResolutionLitige | null;
  resolution_motif: string | null;
  resolution_commentaire: string | null;
  resolution_montant: number | null;
  resolue_par: string | null;
  resolue_at: string | null;
  created_at: string;
}

export interface HistoriqueAnnulationRow {
  id: string;
  course_id: string;
  utilisateur_id: string;
  role: RoleAnnulation;
  motif: string;
  commentaire: string | null;
  statut_precedent: CourseStatus;
  nouveau_statut: CourseStatus;
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
    statut: row.statut,
    niveauId: row.niveau_id,
    nombreLivraisons: row.nombre_livraisons,
    nombreCoursesAssignees: row.nombre_courses_assignees,
    nombreCoursesAnnulees: row.nombre_courses_annulees,
    dureeLivraisonTotaleSecondes: row.duree_livraison_totale_secondes,
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
    destinataireCarnetId: row.destinataire_carnet_id,
    pointDepartId: row.point_depart_id,
    accepteeAt: row.acceptee_at,
    recupereeAt: row.recuperee_at,
    livreeAt: row.livree_at,
    confirmeeAt: row.confirmee_at,
    annuleeAt: row.annulee_at,
    annuleePar: row.annulee_par,
    motifAnnulation: row.motif_annulation,
    commentaireAnnulation: row.commentaire_annulation,
    statutAvantLitige: row.statut_avant_litige,
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
    resolution: row.resolution,
    resolutionMotif: row.resolution_motif,
    resolutionCommentaire: row.resolution_commentaire,
    resolutionMontant: row.resolution_montant,
    resoluePar: row.resolue_par,
    resolueAt: row.resolue_at,
    createdAt: row.created_at,
  };
}

export function historiqueAnnulationFromRow(row: HistoriqueAnnulationRow): HistoriqueAnnulation {
  return {
    id: row.id,
    courseId: row.course_id,
    utilisateurId: row.utilisateur_id,
    role: row.role,
    motif: row.motif,
    commentaire: row.commentaire,
    statutPrecedent: row.statut_precedent,
    nouveauStatut: row.nouveau_statut,
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
    subscriptionPlan: row.subscription_plan,
    abonnementDebuteLe: row.abonnement_debute_le,
    abonnementExpireLe: row.abonnement_expire_le,
    abonnementSuspendu: row.abonnement_suspendu,
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

export interface ModeleCommunicationRow {
  id: string;
  code: string;
  type: CanalCommunication;
  nom: string;
  sujet: string | null;
  contenu: string;
  variables: string[];
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export function modeleCommunicationFromRow(row: ModeleCommunicationRow): ModeleCommunication {
  return {
    id: row.id,
    code: row.code,
    canal: row.type,
    nom: row.nom,
    sujet: row.sujet,
    contenu: row.contenu,
    variables: row.variables ?? [],
    actif: row.actif,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CommunicationRow {
  id: string;
  utilisateur_id: string | null;
  declenche_par: string;
  type: CanalCommunication;
  destinataire: string;
  modele_code: string | null;
  contenu: string;
  statut: StatutCommunication;
  erreur: string | null;
  created_at: string;
  envoye_at: string | null;
  livre_at: string | null;
  lu_at: string | null;
}

export function communicationFromRow(row: CommunicationRow): CommunicationEnvoyee {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    declenchePar: row.declenche_par,
    canal: row.type,
    destinataire: row.destinataire,
    modeleCode: row.modele_code,
    contenu: row.contenu,
    statut: row.statut,
    erreur: row.erreur,
    createdAt: row.created_at,
    envoyeAt: row.envoye_at,
    livreAt: row.livre_at,
    luAt: row.lu_at,
  };
}

export interface CodeOtpRow {
  id: string;
  utilisateur_id: string | null;
  destinataire: string;
  code: string;
  objectif: ObjectifOtp;
  expire_at: string;
  utilise: boolean;
  created_at: string;
}

export function codeOtpFromRow(row: CodeOtpRow): CodeOtp {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    destinataire: row.destinataire,
    objectif: row.objectif,
    expireAt: row.expire_at,
    utilise: row.utilise,
    createdAt: row.created_at,
  };
}

export interface PaiementRow {
  id: string;
  course_id: string;
  utilisateur_id: string;
  reference: string;
  montant_attendu: number;
  montant_paye: number | null;
  reseau: PaymentOperator | null;
  numero_payeur: string | null;
  reference_transaction: string | null;
  date_paiement_declaree: string | null;
  capture_url: string | null;
  statut: StatutPaiementManuel;
  valide_par: string | null;
  valide_at: string | null;
  motif_rejet: string | null;
  declare_at: string | null;
  created_at: string;
  updated_at: string;
}

export function paiementFromRow(row: PaiementRow): Paiement {
  return {
    id: row.id,
    courseId: row.course_id,
    utilisateurId: row.utilisateur_id,
    reference: row.reference,
    montantAttendu: row.montant_attendu,
    montantPaye: row.montant_paye,
    reseau: row.reseau,
    numeroPayeur: row.numero_payeur,
    referenceTransaction: row.reference_transaction,
    datePaiementDeclaree: row.date_paiement_declaree,
    captureUrl: row.capture_url,
    statut: row.statut,
    valideParId: row.valide_par,
    valideAt: row.valide_at,
    motifRejet: row.motif_rejet,
    declareAt: row.declare_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CatalogueNiveauRow {
  id: string;
  code: string;
  nom: string;
  seuil_livraisons_min: number;
  couleur: string;
  icone: string | null;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export function catalogueNiveauFromRow(row: CatalogueNiveauRow): NiveauCoursier {
  return {
    id: row.id,
    code: row.code,
    nom: row.nom,
    seuilLivraisonsMin: row.seuil_livraisons_min,
    couleur: row.couleur,
    icone: row.icone,
    ordre: row.ordre,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CatalogueBadgeRow {
  id: string;
  code: string;
  nom: string;
  icone: string;
  description: string;
  couleur: string;
  mode_attribution: ModeAttributionBadge;
  regle: RegleBadge;
  actif: boolean;
  ordre_affichage: number;
  created_at: string;
  updated_at: string;
}

export function catalogueBadgeFromRow(row: CatalogueBadgeRow): BadgeCoursier {
  return {
    id: row.id,
    code: row.code,
    nom: row.nom,
    icone: row.icone,
    description: row.description,
    couleur: row.couleur,
    modeAttribution: row.mode_attribution,
    regle: row.regle ?? {},
    actif: row.actif,
    ordreAffichage: row.ordre_affichage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface BadgeCoursierRow {
  id: string;
  coursier_id: string;
  badge_id: string;
  attribue_le: string;
  expire_le: string | null;
  attribue_par: string | null;
  retire_le: string | null;
  retire_par: string | null;
  created_at: string;
}

export function badgeCoursierFromRow(row: BadgeCoursierRow): BadgeCoursierAttribue {
  return {
    id: row.id,
    coursierId: row.coursier_id,
    badgeId: row.badge_id,
    attribueLe: row.attribue_le,
    expireLe: row.expire_le,
    attribuePar: row.attribue_par,
    retireLe: row.retire_le,
    retirePar: row.retire_par,
    createdAt: row.created_at,
  };
}

export interface HistoriqueCoursierRow {
  id: string;
  coursier_id: string;
  action: ActionHistoriqueCoursier;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  motif: string | null;
  commentaire: string | null;
  administrateur_id: string | null;
  created_at: string;
}

export function historiqueCoursierFromRow(row: HistoriqueCoursierRow): HistoriqueCoursier {
  return {
    id: row.id,
    coursierId: row.coursier_id,
    action: row.action,
    ancienneValeur: row.ancienne_valeur,
    nouvelleValeur: row.nouvelle_valeur,
    motif: row.motif,
    commentaire: row.commentaire,
    administrateurId: row.administrateur_id,
    createdAt: row.created_at,
  };
}

// --- Abonnements commerçants (COLIMO PRO) ---------------------------------

export interface DemandeAbonnementRow {
  id: string;
  commerce_id: string;
  utilisateur_id: string;
  pack_demande: PackPayant;
  statut: StatutDemandeAbonnement;
  created_at: string;
  updated_at: string;
}

export function demandeAbonnementFromRow(row: DemandeAbonnementRow): DemandeAbonnement {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    utilisateurId: row.utilisateur_id,
    packDemande: row.pack_demande,
    statut: row.statut,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface HistoriqueAbonnementRow {
  id: string;
  commerce_id: string;
  administrateur_id: string | null;
  action: ActionHistoriqueAbonnement;
  ancien_forfait: string | null;
  nouveau_forfait: string | null;
  date_expiration: string | null;
  motif: string | null;
  commentaire: string | null;
  created_at: string;
}

export function historiqueAbonnementFromRow(row: HistoriqueAbonnementRow): HistoriqueAbonnement {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    administrateurId: row.administrateur_id,
    action: row.action,
    ancienForfait: row.ancien_forfait,
    nouveauForfait: row.nouveau_forfait,
    dateExpiration: row.date_expiration,
    motif: row.motif,
    commentaire: row.commentaire,
    createdAt: row.created_at,
  };
}

export interface CommerceMembreRow {
  id: string;
  commerce_id: string;
  utilisateur_id: string;
  role: RoleCommerceMembre;
  invite_par: string | null;
  created_at: string;
}

export function commerceMembreFromRow(row: CommerceMembreRow): CommerceMembre {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    utilisateurId: row.utilisateur_id,
    role: row.role,
    invitePar: row.invite_par,
    createdAt: row.created_at,
  };
}

export interface InvitationCommerceRow {
  id: string;
  commerce_id: string;
  code: string;
  role: RoleCommerceMembre;
  cree_par: string;
  utilise_par: string | null;
  expire_le: string;
  created_at: string;
}

export function invitationCommerceFromRow(row: InvitationCommerceRow): InvitationCommerce {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    code: row.code,
    role: row.role,
    creePar: row.cree_par,
    utiliseParId: row.utilise_par,
    expireLe: row.expire_le,
    createdAt: row.created_at,
  };
}

export interface CommerceDestinataireRow {
  id: string;
  commerce_id: string;
  nom: string;
  telephone: string;
  adresse: string | null;
  instructions: string | null;
  created_at: string;
}

export function commerceDestinataireFromRow(row: CommerceDestinataireRow): CommerceDestinataire {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    nom: row.nom,
    telephone: row.telephone,
    adresse: row.adresse,
    instructions: row.instructions,
    createdAt: row.created_at,
  };
}

export interface CommerceAdresseFavoriteRow {
  id: string;
  commerce_id: string;
  label: string;
  adresse: string;
  repere: string | null;
  zone: Zone | null;
  created_at: string;
}

export function commerceAdresseFavoriteFromRow(row: CommerceAdresseFavoriteRow): CommerceAdresseFavorite {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    label: row.label,
    adresse: row.adresse,
    repere: row.repere,
    zone: row.zone,
    createdAt: row.created_at,
  };
}

export interface CommercePointDepartRow {
  id: string;
  commerce_id: string;
  label: string;
  adresse: string;
  repere: string | null;
  zone: Zone | null;
  latitude: number | null;
  longitude: number | null;
  actif: boolean;
  created_at: string;
}

export function commercePointDepartFromRow(row: CommercePointDepartRow): CommercePointDepart {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    label: row.label,
    adresse: row.adresse,
    repere: row.repere,
    zone: row.zone,
    latitude: row.latitude,
    longitude: row.longitude,
    actif: row.actif,
    createdAt: row.created_at,
  };
}

export interface CommerceCoursierFavoriRow {
  id: string;
  commerce_id: string;
  coursier_id: string;
  created_at: string;
}

export function commerceCoursierFavoriFromRow(row: CommerceCoursierFavoriRow): CommerceCoursierFavori {
  return {
    id: row.id,
    commerceId: row.commerce_id,
    coursierId: row.coursier_id,
    createdAt: row.created_at,
  };
}

export interface ConfigurationPaiementAbonnementRow {
  numero_paiement: string;
  nom_beneficiaire: string;
  moyen_paiement: string;
  instructions: string;
  whatsapp: string;
  email_contact: string;
  updated_at: string;
}

export function configurationPaiementAbonnementFromRow(
  row: ConfigurationPaiementAbonnementRow
): ConfigurationPaiementAbonnement {
  return {
    numeroPaiement: row.numero_paiement,
    nomBeneficiaire: row.nom_beneficiaire,
    moyenPaiement: row.moyen_paiement,
    instructions: row.instructions,
    whatsapp: row.whatsapp,
    emailContact: row.email_contact,
    updatedAt: row.updated_at,
  };
}
