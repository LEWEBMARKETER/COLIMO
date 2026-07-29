import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CategorieColis,
  CourseStatus,
  ModePaiement,
  PieceIdentiteType,
  TypeClient,
  VehiculeType,
  VerificationStatus,
  Zone,
} from "../types";
import {
  coursierFromRow,
  courseFromRow,
  messageFromRow,
  notationFromRow,
  utilisateurFromRow,
  type CoursierRow,
  type CourseRow,
  type MessageRow,
  type NotationRow,
  type UtilisateurRow,
} from "./mappers";
import type { Coursier, Course, Message, Notation, Utilisateur } from "../types";

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
  body: {
    statutVerification?: VerificationStatus;
    disponibilite?: boolean;
    typePieceIdentite?: PieceIdentiteType;
    pieceIdentiteUrl?: string;
    typeVehicule?: VehiculeType;
  }
): Promise<Coursier> {
  const update: Record<string, unknown> = {};
  if (body.statutVerification) update.statut_verification = body.statutVerification;
  if (typeof body.disponibilite === "boolean") update.disponibilite = body.disponibilite;
  if (body.typePieceIdentite) update.type_piece_identite = body.typePieceIdentite;
  if (body.pieceIdentiteUrl) update.piece_identite_url = body.pieceIdentiteUrl;
  if (body.typeVehicule) update.type_vehicule = body.typeVehicule;

  const { data, error } = await client.from("coursiers").update(update).eq("id", id).select().single();
  if (error) throw error;
  return coursierFromRow(data as CoursierRow);
}

export async function insertUtilisateur(
  client: SupabaseClient,
  input: {
    id: string;
    nom: string;
    prenom?: string;
    telephone: string;
    type: "client" | "coursier";
    typeClient?: TypeClient;
    zone?: Zone | null;
    photoUrl?: string;
  }
): Promise<Utilisateur> {
  const { data, error } = await client
    .from("utilisateurs")
    .insert({
      id: input.id,
      nom: input.nom,
      prenom: input.prenom ?? null,
      telephone: input.telephone,
      type: input.type,
      type_client: input.typeClient ?? null,
      zone: input.zone ?? null,
      photo_url: input.photoUrl ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return utilisateurFromRow(data as UtilisateurRow);
}

export async function updateUtilisateur(
  client: SupabaseClient,
  id: string,
  body: { nom?: string; prenom?: string; telephone?: string; zone?: Zone; photoUrl?: string }
): Promise<Utilisateur> {
  const update: Record<string, unknown> = {};
  if (body.nom) update.nom = body.nom;
  if (body.prenom) update.prenom = body.prenom;
  if (body.telephone) update.telephone = body.telephone;
  if (body.zone) update.zone = body.zone;
  if (body.photoUrl) update.photo_url = body.photoUrl;

  const { data, error } = await client.from("utilisateurs").update(update).eq("id", id).select().single();
  if (error) throw error;
  return utilisateurFromRow(data as UtilisateurRow);
}

export async function insertCoursier(
  client: SupabaseClient,
  input: {
    utilisateurId: string;
    documents: string[];
    typeVehicule: VehiculeType;
    typePieceIdentite?: PieceIdentiteType;
    pieceIdentiteUrl?: string;
  }
): Promise<Coursier> {
  const { data, error } = await client
    .from("coursiers")
    .insert({
      utilisateur_id: input.utilisateurId,
      documents: input.documents,
      type_vehicule: input.typeVehicule,
      type_piece_identite: input.typePieceIdentite ?? null,
      piece_identite_url: input.pieceIdentiteUrl ?? null,
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
  }
): Promise<Course> {
  const { data, error } = await client
    .from("courses")
    .insert({
      client_id: input.clientId,
      adresse_depart: input.adresseDepart,
      adresse_arrivee: input.adresseArrivee,
      latitude_depart: input.latitudeDepart ?? null,
      longitude_depart: input.longitudeDepart ?? null,
      latitude_arrivee: input.latitudeArrivee ?? null,
      longitude_arrivee: input.longitudeArrivee ?? null,
      zone_depart: input.zoneDepart,
      zone_arrivee: input.zoneArrivee,
      type_colis: input.typeColis,
      categorie_colis: input.categorieColis,
      livraison_prioritaire: input.livraisonPrioritaire ?? false,
      mode_paiement: input.modePaiement,
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

export async function getMessages(client: SupabaseClient, courseId: string): Promise<Message[]> {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MessageRow[]).map(messageFromRow);
}

export async function envoyerMessage(
  client: SupabaseClient,
  input: { courseId: string; auteurId: string; contenu: string }
): Promise<Message> {
  const { data, error } = await client
    .from("messages")
    .insert({ course_id: input.courseId, auteur_id: input.auteurId, contenu: input.contenu })
    .select()
    .single();
  if (error) throw error;
  return messageFromRow(data as MessageRow);
}

export async function uploadFichier(
  client: SupabaseClient,
  bucket: "avatars" | "documents",
  chemin: string,
  fichier: ArrayBuffer,
  contentType: string
): Promise<string> {
  const { error } = await client.storage.from(bucket).upload(chemin, fichier, { upsert: true, contentType });
  if (error) throw error;

  if (bucket === "avatars") {
    return client.storage.from(bucket).getPublicUrl(chemin).data.publicUrl;
  }

  const { data, error: signedError } = await client.storage.from(bucket).createSignedUrl(chemin, 60 * 60 * 24 * 365);
  if (signedError) throw signedError;
  return data.signedUrl;
}
