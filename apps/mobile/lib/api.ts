import {
  creerCourse as creerCourseQuery,
  creerNotation as creerNotationQuery,
  envoyerMessage as envoyerMessageQuery,
  getCourse as getCourseQuery,
  getCoursiers as getCoursiersQuery,
  getCourses as getCoursesQuery,
  getMessages as getMessagesQuery,
  getNotations as getNotationsQuery,
  insertCoursier,
  insertUtilisateur,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  updateUtilisateur as updateUtilisateurQuery,
  uploadFichier,
  type CategorieColis,
  type Coursier,
  type Course,
  type CourseStatus,
  type Message,
  type ModePaiement,
  type Notation,
  type PieceIdentiteType,
  type TypeClient,
  type Utilisateur,
  type VehiculeType,
  type VerificationStatus,
  type Zone,
} from "@colimo/shared";
import { supabase } from "./supabaseClient";

export type { CoursierAvecUtilisateur } from "@colimo/shared";

export function getCoursiers() {
  return getCoursiersQuery(supabase);
}

export function patchCoursier(
  id: string,
  body: {
    statutVerification?: VerificationStatus;
    disponibilite?: boolean;
    typePieceIdentite?: PieceIdentiteType;
    pieceIdentiteUrl?: string;
    typeVehicule?: VehiculeType;
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

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus; clientId?: string; coursierId?: string }): Promise<Course[]> {
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
}): Promise<Course> {
  return creerCourseQuery(supabase, body);
}

export function patchCourse(id: string, body: { statut?: CourseStatus; coursierId?: string | null }): Promise<Course> {
  return patchCourseQuery(supabase, id, body);
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

export async function uploaderPieceIdentite(utilisateurId: string, uri: string, mimeType: string): Promise<string> {
  const donnees = await uriVersArrayBuffer(uri);
  const extension = mimeType.includes("png") ? "png" : "jpg";
  return uploadFichier(supabase, "documents", `${utilisateurId}/piece_identite.${extension}`, donnees, mimeType);
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
}): Promise<Utilisateur> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  const photoUrl = input.photo ? await uploaderAvatar(data.user.id, input.photo.uri, input.photo.mimeType) : undefined;

  return insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    telephone: input.telephone,
    type: "client",
    typeClient: input.typeClient,
    zone: input.zone ?? null,
    photoUrl,
  });
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
  });

  return { utilisateur, coursier };
}
