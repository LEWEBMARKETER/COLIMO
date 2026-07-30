import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CategorieColis,
  CourseStatus,
  LitigeMotif,
  ModePaiement,
  PieceIdentiteType,
  TypeClient,
  TypeReductionPromo,
  VehiculeType,
  VerificationStatus,
  Zone,
} from "../types";
import {
  codePromoFromRow,
  commercantFromRow,
  coursierFromRow,
  courseFromRow,
  litigeFromRow,
  messageFromRow,
  notationFromRow,
  utilisateurFromRow,
  type CodePromoRow,
  type CommercantRow,
  type CoursierRow,
  type CourseRow,
  type LitigeRow,
  type MessageRow,
  type NotationRow,
  type UtilisateurRow,
} from "./mappers";
import type { CodePromo, Commercant, Coursier, Course, Litige, Message, Notation, Utilisateur } from "../types";

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
    zonesCouvertes?: Zone[];
  }
): Promise<Coursier> {
  const update: Record<string, unknown> = {};
  if (body.statutVerification) update.statut_verification = body.statutVerification;
  if (typeof body.disponibilite === "boolean") update.disponibilite = body.disponibilite;
  if (body.typePieceIdentite) update.type_piece_identite = body.typePieceIdentite;
  if (body.pieceIdentiteUrl) update.piece_identite_url = body.pieceIdentiteUrl;
  if (body.typeVehicule) update.type_vehicule = body.typeVehicule;
  if (body.zonesCouvertes) update.zones_couvertes = body.zonesCouvertes;

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
  body: { nom?: string; prenom?: string; telephone?: string; zone?: Zone; photoUrl?: string; statut?: string }
): Promise<Utilisateur> {
  const update: Record<string, unknown> = {};
  if (body.nom) update.nom = body.nom;
  if (body.prenom) update.prenom = body.prenom;
  if (body.telephone) update.telephone = body.telephone;
  if (body.zone) update.zone = body.zone;
  if (body.photoUrl) update.photo_url = body.photoUrl;
  if (body.statut) update.statut = body.statut;

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
    zonesCouvertes?: Zone[];
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
      zones_couvertes: input.zonesCouvertes ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return coursierFromRow(data as CoursierRow);
}

export async function getCourses(
  client: SupabaseClient,
  params?: { zone?: Zone; zones?: Zone[]; statut?: CourseStatus; clientId?: string; coursierId?: string }
): Promise<Course[]> {
  let query = client.from("courses").select("*").order("created_at", { ascending: false });
  if (params?.zone) query = query.eq("zone_depart", params.zone);
  if (params?.zones && params.zones.length > 0) query = query.in("zone_depart", params.zones);
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
    codePromoId?: string;
    reductionPromo?: number;
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
      code_promo_id: input.codePromoId ?? null,
      reduction_promo: input.reductionPromo ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function patchCourse(
  client: SupabaseClient,
  id: string,
  body: { statut?: CourseStatus; coursierId?: string | null; fraisRetour?: number | null }
): Promise<Course> {
  const update: Record<string, unknown> = {};
  if (body.statut) update.statut = body.statut;
  if (body.coursierId !== undefined) update.coursier_id = body.coursierId;
  if (body.fraisRetour !== undefined) update.frais_retour = body.fraisRetour;

  const { data, error } = await client.from("courses").update(update).eq("id", id).select().single();
  if (error) throw error;
  return courseFromRow(data as CourseRow);
}

export async function creerLitige(
  client: SupabaseClient,
  input: { courseId: string; auteurId: string; motif: LitigeMotif; commentaire?: string; preuveUrls?: string[] }
): Promise<Litige> {
  const { data, error } = await client
    .from("litiges")
    .insert({
      course_id: input.courseId,
      auteur_id: input.auteurId,
      motif: input.motif,
      commentaire: input.commentaire ?? null,
      preuve_urls: input.preuveUrls ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return litigeFromRow(data as LitigeRow);
}

export async function getLitiges(client: SupabaseClient, params?: { courseId?: string }): Promise<Litige[]> {
  let requete = client.from("litiges").select("*").order("created_at", { ascending: false });
  if (params?.courseId) requete = requete.eq("course_id", params.courseId);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as LitigeRow[]).map(litigeFromRow);
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

// --- Commerçants -----------------------------------------------------------

export async function getCommercantsBruts(client: SupabaseClient): Promise<Commercant[]> {
  const { data, error } = await client.from("commercants").select("*");
  if (error) throw error;
  return (data as CommercantRow[]).map(commercantFromRow);
}

export async function upsertCommercant(
  client: SupabaseClient,
  input: { utilisateurId: string; adresse?: string; responsable?: string; horaires?: string; commissionTaux?: number }
): Promise<Commercant> {
  const { data, error } = await client
    .from("commercants")
    .upsert(
      {
        utilisateur_id: input.utilisateurId,
        adresse: input.adresse ?? null,
        responsable: input.responsable ?? null,
        horaires: input.horaires ?? null,
        commission_taux: input.commissionTaux ?? 0.15,
      },
      { onConflict: "utilisateur_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return commercantFromRow(data as CommercantRow);
}

// --- Codes promo -------------------------------------------------------------

export async function getCodesPromo(client: SupabaseClient): Promise<CodePromo[]> {
  const { data, error } = await client.from("codes_promo").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CodePromoRow[]).map(codePromoFromRow);
}

export async function getCodePromoParCode(client: SupabaseClient, code: string): Promise<CodePromo | null> {
  const { data, error } = await client
    .from("codes_promo")
    .select("*")
    .ilike("code", code)
    .maybeSingle();
  if (error) throw error;
  return data ? codePromoFromRow(data as CodePromoRow) : null;
}

export async function creerCodePromo(
  client: SupabaseClient,
  input: {
    code: string;
    typeReduction: TypeReductionPromo;
    valeur: number;
    dateDebut?: string;
    dateFin?: string;
    usageMax?: number;
  }
): Promise<CodePromo> {
  const { data, error } = await client
    .from("codes_promo")
    .insert({
      code: input.code.toUpperCase(),
      type_reduction: input.typeReduction,
      valeur: input.valeur,
      date_debut: input.dateDebut ?? null,
      date_fin: input.dateFin ?? null,
      usage_max: input.usageMax ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return codePromoFromRow(data as CodePromoRow);
}

export async function patchCodePromo(
  client: SupabaseClient,
  id: string,
  body: { actif?: boolean; usageActuel?: number }
): Promise<CodePromo> {
  const update: Record<string, unknown> = {};
  if (typeof body.actif === "boolean") update.actif = body.actif;
  if (typeof body.usageActuel === "number") update.usage_actuel = body.usageActuel;

  const { data, error } = await client.from("codes_promo").update(update).eq("id", id).select().single();
  if (error) throw error;
  return codePromoFromRow(data as CodePromoRow);
}
