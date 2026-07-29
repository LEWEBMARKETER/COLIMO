import {
  getUtilisateurs as getUtilisateursQuery,
  getCoursiers as getCoursiersQuery,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  updateUtilisateur as updateUtilisateurQuery,
  getCourses as getCoursesQuery,
  type Coursier,
  type Course,
  type CourseStatus,
  type VerificationStatus,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";
import { createClient } from "./supabaseClient";

export type { CoursierAvecUtilisateur } from "@colimo/shared";

export function getUtilisateurs(): Promise<Utilisateur[]> {
  return getUtilisateursQuery(createClient());
}

export function getCoursiers() {
  return getCoursiersQuery(createClient());
}

export function patchCoursier(
  id: string,
  body: { statutVerification?: VerificationStatus; disponibilite?: boolean }
): Promise<Coursier> {
  return patchCoursierQuery(createClient(), id, body);
}

export function updateUtilisateur(
  id: string,
  body: { nom?: string; telephone?: string; zone?: Zone; statut?: string }
): Promise<Utilisateur> {
  return updateUtilisateurQuery(createClient(), id, body);
}

export function patchCourse(id: string, body: { statut?: CourseStatus; coursierId?: string | null }): Promise<Course> {
  return patchCourseQuery(createClient(), id, body);
}

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  return getCoursesQuery(createClient(), params);
}
