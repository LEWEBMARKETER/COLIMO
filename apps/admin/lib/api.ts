import {
  creerCodePromo as creerCodePromoQuery,
  getCodesPromo as getCodesPromoQuery,
  getCommercantsBruts as getCommercantsBrutsQuery,
  getLitiges as getLitigesQuery,
  getModelesNotification as getModelesNotificationQuery,
  getNotifications as getNotificationsQuery,
  getUtilisateurs as getUtilisateursQuery,
  getCoursiers as getCoursiersQuery,
  patchCodePromo as patchCodePromoQuery,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  patchModeleNotification as patchModeleNotificationQuery,
  updateUtilisateur as updateUtilisateurQuery,
  upsertCommercant as upsertCommercantQuery,
  getCourses as getCoursesQuery,
  type CodePromo,
  type Commercant,
  type Coursier,
  type Course,
  type CourseStatus,
  type Litige,
  type ModeleNotification,
  type NotificationEnvoyee,
  type StatutNotification,
  type TypeNotification,
  type TypeReductionPromo,
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

export function patchCourse(
  id: string,
  body: { statut?: CourseStatus; coursierId?: string | null; fraisRetour?: number | null }
): Promise<Course> {
  return patchCourseQuery(createClient(), id, body);
}

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  return getCoursesQuery(createClient(), params);
}

export function getCommercantsBruts(): Promise<Commercant[]> {
  return getCommercantsBrutsQuery(createClient());
}

export function upsertCommercant(input: {
  utilisateurId: string;
  adresse?: string;
  responsable?: string;
  horaires?: string;
  commissionTaux?: number;
}): Promise<Commercant> {
  return upsertCommercantQuery(createClient(), input);
}

export function getCodesPromo(): Promise<CodePromo[]> {
  return getCodesPromoQuery(createClient());
}

export function creerCodePromo(input: {
  code: string;
  typeReduction: TypeReductionPromo;
  valeur: number;
  dateDebut?: string;
  dateFin?: string;
  usageMax?: number;
}): Promise<CodePromo> {
  return creerCodePromoQuery(createClient(), input);
}

export function patchCodePromo(id: string, body: { actif?: boolean }): Promise<CodePromo> {
  return patchCodePromoQuery(createClient(), id, body);
}

export function getLitiges(): Promise<Litige[]> {
  return getLitigesQuery(createClient());
}

export function getNotifications(params?: { type?: TypeNotification; statut?: StatutNotification }): Promise<
  NotificationEnvoyee[]
> {
  return getNotificationsQuery(createClient(), params);
}

export function getModelesNotification(): Promise<ModeleNotification[]> {
  return getModelesNotificationQuery(createClient());
}

export function patchModeleNotification(
  id: string,
  body: { nom?: string; sujet?: string | null; contenu?: string; actif?: boolean }
): Promise<ModeleNotification> {
  return patchModeleNotificationQuery(createClient(), id, body);
}
