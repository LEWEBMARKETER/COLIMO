import {
  creerCodePromo as creerCodePromoQuery,
  getCodesPromo as getCodesPromoQuery,
  getCommercantsBruts as getCommercantsBrutsQuery,
  getLitiges as getLitigesQuery,
  getModelesCommunication as getModelesCommunicationQuery,
  getCommunications as getCommunicationsQuery,
  getPaiements as getPaiementsQuery,
  getUtilisateurs as getUtilisateursQuery,
  getCoursiers as getCoursiersQuery,
  patchCodePromo as patchCodePromoQuery,
  patchCoursier as patchCoursierQuery,
  patchCourse as patchCourseQuery,
  patchModeleCommunication as patchModeleCommunicationQuery,
  rejeterPaiement as rejeterPaiementQuery,
  updateUtilisateur as updateUtilisateurQuery,
  upsertCommercant as upsertCommercantQuery,
  validerPaiement as validerPaiementQuery,
  getCourses as getCoursesQuery,
  type CanalCommunication,
  type CodePromo,
  type Commercant,
  type CommunicationEnvoyee,
  type Coursier,
  type Course,
  type CourseStatus,
  type Litige,
  type ModeleCommunication,
  type Paiement,
  type StatutCommunication,
  type StatutPaiementManuel,
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

export function getCommunications(params?: {
  canal?: CanalCommunication;
  statut?: StatutCommunication;
  utilisateurId?: string;
  dateDebut?: string;
  dateFin?: string;
  recherche?: string;
}): Promise<CommunicationEnvoyee[]> {
  return getCommunicationsQuery(createClient(), params);
}

export function getModelesCommunication(): Promise<ModeleCommunication[]> {
  return getModelesCommunicationQuery(createClient());
}

export function patchModeleCommunication(
  id: string,
  body: { nom?: string; sujet?: string | null; contenu?: string; actif?: boolean }
): Promise<ModeleCommunication> {
  return patchModeleCommunicationQuery(createClient(), id, body);
}

export function getPaiements(params?: { statut?: StatutPaiementManuel }): Promise<Paiement[]> {
  return getPaiementsQuery(createClient(), params);
}

export async function validerPaiement(paiementId: string): Promise<Paiement> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return validerPaiementQuery(client, paiementId, user.id);
}

export async function rejeterPaiement(paiementId: string, motif?: string): Promise<Paiement> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return rejeterPaiementQuery(client, paiementId, user.id, motif);
}
