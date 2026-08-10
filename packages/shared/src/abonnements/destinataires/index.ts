import type { SupabaseClient } from "@supabase/supabase-js";
import { commerceDestinataireFromRow, courseFromRow, type CommerceDestinataireRow, type CourseRow } from "../../supabase/mappers";
import type { Course } from "../../types";
import type { CommerceDestinataire } from "./types";

export * from "./types";

export async function getDestinatairesCommerce(client: SupabaseClient, commerceId: string): Promise<CommerceDestinataire[]> {
  const { data, error } = await client
    .from("commerce_destinataires")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("nom");
  if (error) throw error;
  return (data as CommerceDestinataireRow[]).map(commerceDestinataireFromRow);
}

/**
 * L'insertion est protégée côté serveur par un trigger (palier Starter+ et
 * limite de 100, migration 0033) — une erreur PostgREST explicite remonte
 * si la condition n'est pas remplie, pas seulement un blocage visuel.
 */
export async function creerDestinataireCommerce(
  client: SupabaseClient,
  input: { commerceId: string; nom: string; telephone: string; adresse?: string; instructions?: string }
): Promise<CommerceDestinataire> {
  const { data, error } = await client
    .from("commerce_destinataires")
    .insert({
      commerce_id: input.commerceId,
      nom: input.nom,
      telephone: input.telephone,
      adresse: input.adresse ?? null,
      instructions: input.instructions ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return commerceDestinataireFromRow(data as CommerceDestinataireRow);
}

export async function patchDestinataireCommerce(
  client: SupabaseClient,
  id: string,
  body: { nom?: string; telephone?: string; adresse?: string; instructions?: string }
): Promise<CommerceDestinataire> {
  const update: Record<string, unknown> = {};
  if (body.nom !== undefined) update.nom = body.nom;
  if (body.telephone !== undefined) update.telephone = body.telephone;
  if (body.adresse !== undefined) update.adresse = body.adresse;
  if (body.instructions !== undefined) update.instructions = body.instructions;

  const { data, error } = await client.from("commerce_destinataires").update(update).eq("id", id).select().single();
  if (error) throw error;
  return commerceDestinataireFromRow(data as CommerceDestinataireRow);
}

export async function supprimerDestinataireCommerce(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("commerce_destinataires").delete().eq("id", id);
  if (error) throw error;
}

// Historique des livraisons d'un destinataire du carnet (section 3.1 du
// besoin) — les courses créées en le sélectionnant portent son id via
// courses.destinataire_carnet_id (migration 0033).
export async function getCoursesPourDestinataire(client: SupabaseClient, destinataireCarnetId: string): Promise<Course[]> {
  const { data, error } = await client
    .from("courses")
    .select("*")
    .eq("destinataire_carnet_id", destinataireCarnetId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CourseRow[]).map(courseFromRow);
}
