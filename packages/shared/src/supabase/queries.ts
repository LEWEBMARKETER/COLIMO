import type { SupabaseClient } from "@supabase/supabase-js";
import type { CourseStatus, VehiculeType, VerificationStatus, Zone } from "../types";
import {
  coursierFromRow,
  courseFromRow,
  notationFromRow,
  utilisateurFromRow,
  type CoursierRow,
  type CourseRow,
  type NotationRow,
  type UtilisateurRow,
} from "./mappers";
import type { Coursier, Course, Notation, Utilisateur } from "../types";

export interface CoursierAvecUtilisateur extends Coursier {
  utilisateur: Utilisateur;
}

export async function getUtilisateurs(client: SupabaseClient): Promise<Utilisateur[]> {
  const { data, error } = await client.from("utilisateurs").select("*");
  if (error) throw error;
  return (data as UtilisateurRow[]).map(utilisateurFromRow);
}

export async function getUtilisateur(client: SupabaseClient, id: string): Promise<Utilisateur | null> {
  const { data, error } = await client.from("utilisateurs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? utilisateurFromRow(data as UtilisateurRow) : null;
}

export async function getCoursierByUtilisateurId(
  client: SupabaseClient,
  utilisateurId: string
): Promise<Coursier | null> {
  const { data, error } = await client
    .from("coursiers")
    .select("*")
    .eq("utilisateur_id", utilisateurId)
    .maybeSingle();
  if (error) throw error;
  return data ? coursierFromRow(data as CoursierRow) : null;
}

export async function getCoursiers(client: SupabaseClient): Promise<CoursierAvecUtilisateur[]> {
  const { data, error } = await client.from("coursiers").select("*, utilisateur:utilisateurs(*)");
  if (error) throw error;
  return (data as (CoursierRow & { utilisateur: UtilisateurRow })[]).map((row) => ({
    ...coursierFromRow(row),
    utilisateur: utilisateurFromRow(row.utilisateur),
  }));
}

export async function patchCoursier(
  client: SupabaseClient,
  id: string,
  body: { statutVerification?: VerificationStatus; disponibilite?: boolean }
): Promise<Coursier> {
  const update: Record<string, unknown> = {};
  if (body.statutVerification) update.statut_verification = body.statutVerification;
  if (typeof body.disponibilite === "boolean") update.disponibilite = body.disponibilite;

  const { data, error } = await client.from("coursiers").update(update).eq("id", id).select().single();
  if (error) throw error;
  return coursierFromRow(data as CoursierRow);
}

export async function insertUtilisateur(
  client: SupabaseClient,
  input: { id: string; nom: string; telephone: string; type: "client" | "coursier"; zone?: Zone | null }
): Promise<Utilisateur> {
  const { data, error } = await client
    .from("utilisateurs")
    .insert({
      id: input.id,
      nom: input.nom,
      telephone: input.telephone,
      type: input.type,
      zone: input.zone ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return utilisateurFromRow(data as UtilisateurRow);
}

export async function insertCoursier(
  client: SupabaseClient,
  input: { utilisateurId: string; documents: string[]; typeVehicule: VehiculeType }
): Promise<Coursier> {
  const { data, error } = await client
    .from("coursiers")
    .insert({
      utilisateur_id: input.utilisateurId,
      documents: input.documents,
      type_vehicule: input.typeVehicule,
    })
    .select()
    .single();
  if (error) throw error;
  return coursierFromRow(data as CoursierRow);
}

export async function getCourses(
  client: SupabaseClient,
  params?: { zone?: Zone; statut?: CourseStatus; clientId?: string; coursierId?: string }
): Promise<Course[]> {
  let query = client.from("courses").select("*").order("created_at", { ascending: false });
  if (params?.zone) query = query.eq("zone_depart", params.zone);
  if (params?.statut) query = query.eq("statut", params.statut);
  if (params?.clientId) query = query.eq("client_id", params.clientId);
  if (params?.coursierId) query = query.eq("coursier_id", params.coursierId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as CourseRow[]).map(courseFromRow);
}

export async function getCourse(client: SupabaseClient, id: string): Promise<Course> {
  const { data, error } = await client.from("courses").select("*").eq("id", id).single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function creerCourse(
  client: SupabaseClient,
  input: {
    clientId: string;
    adresseDepart: string;
    adresseArrivee: string;
    zoneDepart: Zone;
    zoneArrivee: Zone;
    typeColis: string;
    livraisonPrioritaire?: boolean;
    valeurDeclaree?: number;
    prix: number;
  }
): Promise<Course> {
  const { data, error } = await client
    .from("courses")
    .insert({
      client_id: input.clientId,
      adresse_depart: input.adresseDepart,
      adresse_arrivee: input.adresseArrivee,
      zone_depart: input.zoneDepart,
      zone_arrivee: input.zoneArrivee,
      type_colis: input.typeColis,
      livraison_prioritaire: input.livraisonPrioritaire ?? false,
      valeur_declaree: input.valeurDeclaree ?? null,
      prix: input.prix,
    })
    .select()
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function patchCourse(
  client: SupabaseClient,
  id: string,
  body: { statut?: CourseStatus; coursierId?: string | null }
): Promise<Course> {
  const update: Record<string, unknown> = {};
  if (body.statut) update.statut = body.statut;
  if (body.coursierId !== undefined) update.coursier_id = body.coursierId;

  const { data, error } = await client.from("courses").update(update).eq("id", id).select().single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function getNotations(client: SupabaseClient, courseId: string): Promise<Notation[]> {
  const { data, error } = await client.from("notations").select("*").eq("course_id", courseId);
  if (error) throw error;
  return (data as NotationRow[]).map(notationFromRow);
}

export async function creerNotation(
  client: SupabaseClient,
  input: { courseId: string; auteurId: string; destinataireId: string; note: number; commentaire?: string }
): Promise<Notation> {
  const { data, error } = await client
    .from("notations")
    .insert({
      course_id: input.courseId,
      auteur_id: input.auteurId,
      destinataire_id: input.destinataireId,
      note: input.note,
      commentaire: input.commentaire ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return notationFromRow(data as NotationRow);
}
