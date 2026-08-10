import {
  annulerCourseClient as annulerCourseClientQuery,
  creerCourse as creerCourseQuery,
  creerLitige as creerLitigeQuery,
  creerNotation as creerNotationQuery,
  envoyerMessage as envoyerMessageQuery,
  getCodePromoParCode as getCodePromoParCodeQuery,
  getCommercantsBruts as getCommercantsBrutsQuery,
  getCommunications as getCommunicationsQuery,
  getCourse as getCourseQuery,
  getCoursierByUtilisateurId as getCoursierByUtilisateurIdQuery,
  getCoursiers as getCoursiersQuery,
  getCourses as getCoursesQuery,
  getLitiges as getLitigesQuery,
  getMessages as getMessagesQuery,
  getNotations as getNotationsQuery,
  getPaiementParCourse as getPaiementParCourseQuery,
  getUtilisateur as getUtilisateurQuery,
  declarerPaiement as declarerPaiementQuery,
  initierPaiementManuel as initierPaiementManuelQuery,
  insertCoursier,
  insertUtilisateur,
  marquerCommunicationLue as marquerCommunicationLueQuery,
  marquerToutesCommunicationsLues as marquerToutesCommunicationsLuesQuery,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  recalculerBadgesEtNiveau as recalculerBadgesEtNiveauQuery,
  updateUtilisateur as updateUtilisateurQuery,
  upsertCommercant as upsertCommercantQuery,
  uploadFichier,
  demanderActivationAbonnement as demanderActivationAbonnementQuery,
  getConfigurationPaiementAbonnement as getConfigurationPaiementAbonnementQuery,
  creerInvitationCommerce as creerInvitationCommerceQuery,
  rejoindreCommerce as rejoindreCommerceQuery,
  getMembresCommerce as getMembresCommerceQuery,
  getInvitationsCommerce as getInvitationsCommerceQuery,
  getDestinatairesCommerce as getDestinatairesCommerceQuery,
  creerDestinataireCommerce as creerDestinataireCommerceQuery,
  patchDestinataireCommerce as patchDestinataireCommerceQuery,
  supprimerDestinataireCommerce as supprimerDestinataireCommerceQuery,
  getCoursesPourDestinataire as getCoursesPourDestinataireQuery,
  getAdressesFavoritesCommerce as getAdressesFavoritesCommerceQuery,
  creerAdresseFavoriteCommerce as creerAdresseFavoriteCommerceQuery,
  supprimerAdresseFavoriteCommerce as supprimerAdresseFavoriteCommerceQuery,
  getPointsDepartCommerce as getPointsDepartCommerceQuery,
  creerPointDepartCommerce as creerPointDepartCommerceQuery,
  supprimerPointDepartCommerce as supprimerPointDepartCommerceQuery,
  getCoursiersFavorisCommerce as getCoursiersFavorisCommerceQuery,
  ajouterCoursierFavori as ajouterCoursierFavoriQuery,
  retirerCoursierFavori as retirerCoursierFavoriQuery,
  type ActiviteCommerce,
  type CategorieColis,
  type CodePromo,
  type Commercant,
  type CommerceAdresseFavorite,
  type CommerceCoursierFavori,
  type CommerceDestinataire,
  type CommerceMembre,
  type CommercePointDepart,
  type CommunicationEnvoyee,
  type ConfigurationPaiementAbonnement,
  type Coursier,
  type Course,
  type CourseStatus,
  type DemandeAbonnement,
  type InvitationCommerce,
  type Litige,
  type LitigeMotif,
  type Message,
  type ModePaiement,
  type Notation,
  type PackPayant,
  type Paiement,
  type PaymentOperator,
  type PieceIdentiteType,
  type QuiPaie,
  type RoleCommerceMembre,
  type TailleColis,
  type TypeClient,
  type Utilisateur,
  type VehiculeType,
  type VerificationStatus,
  type VolumeLivraisons,
  type Zone,
} from "@colimo/shared";
import { supabase } from "./supabaseClient";

export type { CoursierAvecUtilisateur } from "@colimo/shared";

export function recalculerBadgesEtNiveau(utilisateurId: string): Promise<void> {
  return recalculerBadgesEtNiveauQuery(supabase, utilisateurId);
}

export function getMesCommunications(utilisateurId: string): Promise<CommunicationEnvoyee[]> {
  return getCommunicationsQuery(supabase, { utilisateurId });
}

export function marquerCommunicationLue(id: string): Promise<CommunicationEnvoyee> {
  return marquerCommunicationLueQuery(supabase, id);
}

export function marquerToutesCommunicationsLues(utilisateurId: string): Promise<void> {
  return marquerToutesCommunicationsLuesQuery(supabase, utilisateurId);
}

export function getCoursiers() {
  return getCoursiersQuery(supabase);
}

export function getCoursierByUtilisateurId(utilisateurId: string): Promise<Coursier | null> {
  return getCoursierByUtilisateurIdQuery(supabase, utilisateurId);
}

export function getUtilisateur(id: string): Promise<Utilisateur | null> {
  return getUtilisateurQuery(supabase, id);
}

export function patchCoursier(
  id: string,
  body: {
    statutVerification?: VerificationStatus;
    disponibilite?: boolean;
    typePieceIdentite?: PieceIdentiteType;
    pieceIdentiteUrl?: string;
    typeVehicule?: VehiculeType;
    zonesCouvertes?: Zone[];
  }
): Promise<Coursier> {
  return patchCoursierQuery(supabase, id, body);
}

export function updateUtilisateur(
  id: string,
  body: { nom?: string; prenom?: string; telephone?: string; zone?: Zone; photoUrl?: string }
): Promise<Utilisateur> {
  return updateUtilisateurQuery(supabase, id, body);
}

export function getCourses(params?: {
  zone?: Zone;
  zones?: Zone[];
  statut?: CourseStatus;
  clientId?: string;
  coursierId?: string;
}): Promise<Course[]> {
  return getCoursesQuery(supabase, params);
}

export function getCourse(id: string): Promise<Course> {
  return getCourseQuery(supabase, id);
}

export function creerCourse(body: {
  clientId: string;
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
  livraisonPrioritaire?: boolean;
  modePaiement: ModePaiement;
  valeurDeclaree?: number;
  prix: number;
  codePromoId?: string;
  reductionPromo?: number;
  telephoneDestinataire?: string;
  nomDestinataire?: string;
  nomExpediteur?: string;
  telephoneExpediteur?: string;
  repereDepart?: string;
  repereArrivee?: string;
  tailleColis?: TailleColis;
  quiPaie?: QuiPaie;
  instructions?: string;
  poidsEstime?: number;
  programmeePour?: string;
  destinataireCarnetId?: string;
  pointDepartId?: string;
}): Promise<Course> {
  return creerCourseQuery(supabase, body);
}

export function upsertCommercant(input: {
  utilisateurId: string;
  adresse?: string;
  responsable?: string;
  horaires?: string;
  commissionTaux?: number;
  activite?: ActiviteCommerce;
  volumeQuotidien?: VolumeLivraisons;
  whatsapp?: string;
  photoCommerceUrl?: string;
}): Promise<Commercant> {
  return upsertCommercantQuery(supabase, input);
}

export async function getMonCommerce(utilisateurId: string): Promise<Commercant | null> {
  const commercants = await getCommercantsBrutsQuery(supabase);
  return commercants.find((c) => c.utilisateurId === utilisateurId) ?? null;
}

// --- Abonnements commerçants (COLIMO PRO) -------------------------------

export function demanderActivationAbonnement(pack: PackPayant): Promise<DemandeAbonnement> {
  return demanderActivationAbonnementQuery(supabase, pack);
}

export function getConfigurationPaiementAbonnement(): Promise<ConfigurationPaiementAbonnement> {
  return getConfigurationPaiementAbonnementQuery(supabase);
}

export function creerInvitationCommerce(role?: RoleCommerceMembre): Promise<InvitationCommerce> {
  return creerInvitationCommerceQuery(supabase, role);
}

export function rejoindreCommerce(code: string): Promise<CommerceMembre> {
  return rejoindreCommerceQuery(supabase, code);
}

export function getMembresCommerce(commerceId: string): Promise<CommerceMembre[]> {
  return getMembresCommerceQuery(supabase, commerceId);
}

export function getInvitationsCommerce(commerceId: string): Promise<InvitationCommerce[]> {
  return getInvitationsCommerceQuery(supabase, commerceId);
}

export function getDestinatairesCommerce(commerceId: string): Promise<CommerceDestinataire[]> {
  return getDestinatairesCommerceQuery(supabase, commerceId);
}

export function creerDestinataireCommerce(input: {
  commerceId: string;
  nom: string;
  telephone: string;
  adresse?: string;
  instructions?: string;
}): Promise<CommerceDestinataire> {
  return creerDestinataireCommerceQuery(supabase, input);
}

export function patchDestinataireCommerce(
  id: string,
  body: { nom?: string; telephone?: string; adresse?: string; instructions?: string }
): Promise<CommerceDestinataire> {
  return patchDestinataireCommerceQuery(supabase, id, body);
}

export function supprimerDestinataireCommerce(id: string): Promise<void> {
  return supprimerDestinataireCommerceQuery(supabase, id);
}

export function getCoursesPourDestinataire(destinataireCarnetId: string): Promise<Course[]> {
  return getCoursesPourDestinataireQuery(supabase, destinataireCarnetId);
}

export function getAdressesFavoritesCommerce(commerceId: string): Promise<CommerceAdresseFavorite[]> {
  return getAdressesFavoritesCommerceQuery(supabase, commerceId);
}

export function creerAdresseFavoriteCommerce(input: {
  commerceId: string;
  label: string;
  adresse: string;
  repere?: string;
  zone?: Zone;
}): Promise<CommerceAdresseFavorite> {
  return creerAdresseFavoriteCommerceQuery(supabase, input);
}

export function supprimerAdresseFavoriteCommerce(id: string): Promise<void> {
  return supprimerAdresseFavoriteCommerceQuery(supabase, id);
}

export function getPointsDepartCommerce(commerceId: string): Promise<CommercePointDepart[]> {
  return getPointsDepartCommerceQuery(supabase, commerceId);
}

export function creerPointDepartCommerce(input: {
  commerceId: string;
  label: string;
  adresse: string;
  repere?: string;
  zone?: Zone;
  latitude?: number;
  longitude?: number;
}): Promise<CommercePointDepart> {
  return creerPointDepartCommerceQuery(supabase, input);
}

export function supprimerPointDepartCommerce(id: string): Promise<void> {
  return supprimerPointDepartCommerceQuery(supabase, id);
}

export function getCoursiersFavorisCommerce(commerceId: string): Promise<CommerceCoursierFavori[]> {
  return getCoursiersFavorisCommerceQuery(supabase, commerceId);
}

export function ajouterCoursierFavori(commerceId: string, coursierId: string): Promise<CommerceCoursierFavori> {
  return ajouterCoursierFavoriQuery(supabase, commerceId, coursierId);
}

export function retirerCoursierFavori(id: string): Promise<void> {
  return retirerCoursierFavoriQuery(supabase, id);
}

export function getCodePromoParCode(code: string): Promise<CodePromo | null> {
  return getCodePromoParCodeQuery(supabase, code);
}

export function patchCourse(
  id: string,
  body: { statut?: CourseStatus; coursierId?: string | null }
): Promise<Course> {
  return patchCourseQuery(supabase, id, body);
}

export function annulerCourseClient(body: { courseId: string; motif: string; commentaire?: string }): Promise<Course> {
  return annulerCourseClientQuery(supabase, body);
}

export function creerNotation(body: {
  courseId: string;
  auteurId: string;
  destinataireId: string;
  note: number;
  commentaire?: string;
}): Promise<Notation> {
  return creerNotationQuery(supabase, body);
}

export function getNotations(courseId: string): Promise<Notation[]> {
  return getNotationsQuery(supabase, courseId);
}

export function creerLitige(body: {
  courseId: string;
  auteurId: string;
  motif: LitigeMotif;
  commentaire?: string;
  preuveUrls?: string[];
}): Promise<Litige> {
  return creerLitigeQuery(supabase, body);
}

export function getLitiges(courseId: string): Promise<Litige[]> {
  return getLitigesQuery(supabase, { courseId });
}

export function getMessages(courseId: string): Promise<Message[]> {
  return getMessagesQuery(supabase, courseId);
}

export function envoyerMessage(body: { courseId: string; auteurId: string; contenu: string }): Promise<Message> {
  return envoyerMessageQuery(supabase, body);
}

// --- Upload de photos (avatar, pièce d'identité) -------------------------

async function uriVersArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const reponse = await fetch(uri);
  return reponse.arrayBuffer();
}

export async function uploaderAvatar(utilisateurId: string, uri: string, mimeType: string): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return uploadFichier(supabase, "avatars", `${utilisateurId}/avatar.${extension}`, donnees, mimeType);
}

export async function uploaderPhotoCommerce(utilisateurId: string, uri: string, mimeType: string): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return uploadFichier(supabase, "avatars", `${utilisateurId}/photo-commerce.${extension}`, donnees, mimeType);
}

export async function uploaderPieceIdentite(utilisateurId: string, uri: string, mimeType: string): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return uploadFichier(supabase, "documents", `${utilisateurId}/piece_identite.${extension}`, donnees, mimeType);
}

export async function uploaderPreuveLitige(
  utilisateurId: string,
  courseId: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.split("/")[1] ?? "jpg";
  const nomFichier = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  return uploadFichier(supabase, "documents", `${utilisateurId}/litiges/${courseId}/${nomFichier}`, donnees, mimeType);
}

export async function uploaderCapturePaiement(
  utilisateurId: string,
  courseId: string,
  uri: string,
  mimeType: string
): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.split("/")[1] ?? "jpg";
  const nomFichier = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${extension}`;
  return uploadFichier(supabase, "documents", `${utilisateurId}/paiements/${courseId}/${nomFichier}`, donnees, mimeType);
}

// --- Paiement manuel Airtel Money ----------------------------------------

export function initierPaiementManuel(body: {
  courseId: string;
  utilisateurId: string;
  montantAttendu: number;
}): Promise<Paiement> {
  return initierPaiementManuelQuery(supabase, body);
}

export function getPaiementParCourse(courseId: string): Promise<Paiement | null> {
  return getPaiementParCourseQuery(supabase, courseId);
}

export function declarerPaiement(
  paiementId: string,
  body: {
    reseau: PaymentOperator;
    numeroPayeur: string;
    montantPaye: number;
    referenceTransaction?: string;
    datePaiementDeclaree?: string;
    captureUrl?: string;
  }
): Promise<Paiement> {
  return declarerPaiementQuery(supabase, paiementId, body);
}

// --- Authentification et inscription ------------------------------------

export async function connecter(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function inscrireClient(input: {
  email: string;
  password: string;
  nom: string;
  typeClient: TypeClient;
  telephone: string;
  zone?: Zone;
  photo?: { uri: string; mimeType: string };
  responsable?: string;
  whatsapp?: string;
  activite?: ActiviteCommerce;
  volumeQuotidien?: VolumeLivraisons;
  photoCommerce?: { uri: string; mimeType: string };
}): Promise<Utilisateur> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  const photoUrl = input.photo ? await uploaderAvatar(data.user.id, input.photo.uri, input.photo.mimeType) : undefined;

  const utilisateur = await insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    telephone: input.telephone,
    type: "client",
    typeClient: input.typeClient,
    zone: input.zone ?? null,
    photoUrl,
  });

  if (input.typeClient === "commerce") {
    const photoCommerceUrl = input.photoCommerce
      ? await uploaderPhotoCommerce(data.user.id, input.photoCommerce.uri, input.photoCommerce.mimeType)
      : undefined;
    await upsertCommercantQuery(supabase, {
      utilisateurId: data.user.id,
      responsable: input.responsable,
      whatsapp: input.whatsapp,
      activite: input.activite,
      volumeQuotidien: input.volumeQuotidien,
      photoCommerceUrl,
    });
  }

  return utilisateur;
}

/**
 * Inscription d'un sous-compte de commerce (Pack Business, jusqu'à 3 —
 * cf. supabase/migrations/0032_abonnements_equipe.sql). Même schéma que
 * inscrireClient (signUp puis insertUtilisateur), en plus simple : pas de
 * zone/photo/champs commerce, et surtout aucune ligne commercants propre —
 * ce compte appartient au commerce de l'invitation, jamais à lui-même
 * (typeClient reste vide, l'appartenance se résout via commerce_membres).
 * rejoindreCommerce revalide le code et la limite de 3 côté serveur.
 */
export async function inscrireMembreCommerce(input: {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  codeInvitation: string;
}): Promise<Utilisateur> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  const utilisateur = await insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    telephone: input.telephone,
    type: "client",
  });

  await rejoindreCommerceQuery(supabase, input.codeInvitation);

  return utilisateur;
}

export async function inscrireCoursier(input: {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
  zone: Zone;
  typeVehicule: VehiculeType;
  typePieceIdentite: PieceIdentiteType;
  pieceIdentite: { uri: string; mimeType: string };
  photo?: { uri: string; mimeType: string };
}): Promise<{ utilisateur: Utilisateur; coursier: Coursier }> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  const photoUrl = input.photo ? await uploaderAvatar(data.user.id, input.photo.uri, input.photo.mimeType) : undefined;
  const pieceIdentiteUrl = await uploaderPieceIdentite(
    data.user.id,
    input.pieceIdentite.uri,
    input.pieceIdentite.mimeType
  );

  const utilisateur = await insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    prenom: input.prenom,
    telephone: input.telephone,
    type: "coursier",
    zone: input.zone,
    photoUrl,
  });
  const coursier = await insertCoursier(supabase, {
    utilisateurId: data.user.id,
    documents: [],
    typeVehicule: input.typeVehicule,
    typePieceIdentite: input.typePieceIdentite,
    pieceIdentiteUrl,
    zonesCouvertes: [input.zone],
  });

  return { utilisateur, coursier };
}
