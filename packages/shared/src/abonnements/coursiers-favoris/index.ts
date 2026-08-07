import type { SupabaseClient } from "@supabase/supabase-js";
import { commerceCoursierFavoriFromRow, type CommerceCoursierFavoriRow } from "../../supabase/mappers";
import type { CommerceCoursierFavori } from "./types";

export * from "./types";

// Pure préférence/priorisation — ne garantit jamais l'attribution d'une
// course à ce coursier (section 4.5 du besoin). Le détail du coursier
// (nom, note, nombre de courses, disponibilité) se résout côté appelant
// via getCoursiers(), comme le fait déjà CommerceDashboard.tsx pour les
// coursiers favoris "informels" actuels.
export async function getCoursiersFavorisCommerce(client: SupabaseClient, commerceId: string): Promise<CommerceCoursierFavori[]> {
  const { data, error } = await client
    .from("commerce_coursiers_favoris")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as CommerceCoursierFavoriRow[]).map(commerceCoursierFavoriFromRow);
}

export async function ajouterCoursierFavori(client: SupabaseClient, commerceId: string, coursierId: string): Promise<CommerceCoursierFavori> {
  const { data, error } = await client
    .from("commerce_coursiers_favoris")
    .insert({ commerce_id: commerceId, coursier_id: coursierId })
    .select()
    .single();
  if (error) throw error;
  return commerceCoursierFavoriFromRow(data as CommerceCoursierFavoriRow);
}

export async function retirerCoursierFavori(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("commerce_coursiers_favoris").delete().eq("id", id);
  if (error) throw error;
}
