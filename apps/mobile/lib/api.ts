import {
  creerCourse as creerCourseQuery,
  creerNotation as creerNotationQuery,
  getCourse as getCourseQuery,
  getCoursiers as getCoursiersQuery,
  getCourses as getCoursesQuery,
  getNotations as getNotationsQuery,
  insertCoursier,
  insertUtilisateur,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  type Coursier,
  type Course,
  type CourseStatus,
  type Notation,
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
  body: { statutVerification?: VerificationStatus; disponibilite?: boolean }
): Promise<Coursier> {
  return patchCoursierQuery(supabase, id, body);
}

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  return getCoursesQuery(supabase, params);
}

export function getCourse(id: string): Promise<Course> {
  return getCourseQuery(supabase, id);
}

export function creerCourse(body: {
  clientId: string;
  adresseDepart: string;
  adresseArrivee: string;
  zoneDepart: Zone;
  zoneArrivee: Zone;
  typeColis: string;
  livraisonPrioritaire?: boolean;
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

// --- Authentification et inscription ------------------------------------

export async function connecter(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function inscrireClient(input: {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  zone?: Zone;
}): Promise<Utilisateur> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  return insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    telephone: input.telephone,
    type: "client",
    zone: input.zone ?? null,
  });
}

export async function inscrireCoursier(input: {
  email: string;
  password: string;
  nom: string;
  telephone: string;
  zone: Zone;
  typeVehicule: VehiculeType;
  documents: string[];
}): Promise<{ utilisateur: Utilisateur; coursier: Coursier }> {
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password });
  if (error) throw error;
  if (!data.user) throw new Error("Inscription incomplète : aucun utilisateur créé.");

  const utilisateur = await insertUtilisateur(supabase, {
    id: data.user.id,
    nom: input.nom,
    telephone: input.telephone,
    type: "coursier",
    zone: input.zone,
  });
  const coursier = await insertCoursier(supabase, {
    utilisateurId: data.user.id,
    documents: input.documents,
    typeVehicule: input.typeVehicule,
  });

  return { utilisateur, coursier };
}
