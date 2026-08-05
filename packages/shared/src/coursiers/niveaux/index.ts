import type { SupabaseClient } from "@supabase/supabase-js";
import { catalogueNiveauFromRow, type CatalogueNiveauRow } from "../../supabase/mappers";
import type { NiveauCoursier } from "./types";

export * from "./types";
export * from "./calcul";

export async function getCatalogueNiveaux(client: SupabaseClient): Promise<NiveauCoursier[]> {
  const { data, error } = await client.from("catalogue_niveaux").select("*").order("ordre");
  if (error) throw error;
  return (data as CatalogueNiveauRow[]).map(catalogueNiveauFromRow);
}

export async function patchCatalogueNiveau(
  client: SupabaseClient,
  id: string,
  body: { nom?: string; seuilLivraisonsMin?: number; couleur?: string; icone?: string }
): Promise<NiveauCoursier> {
  const update: Record<string, unknown> = {};
  if (body.nom !== undefined) update.nom = body.nom;
  if (body.seuilLivraisonsMin !== undefined) update.seuil_livraisons_min = body.seuilLivraisonsMin;
  if (body.couleur !== undefined) update.couleur = body.couleur;
  if (body.icone !== undefined) update.icone = body.icone;

  const { data, error } = await client.from("catalogue_niveaux").update(update).eq("id", id).select().single();
  if (error) throw error;
  return catalogueNiveauFromRow(data as CatalogueNiveauRow);
}

/**
 * Seul point d'écriture de coursiers.niveau_id (RLS l'exige : une session
 * client ne peut pas modifier la ligne coursiers directement). Passe par le
 * RPC Postgres définir_niveau_coursier (security definer), qui historise
 * lui-même le changement.
 */
export async function definirNiveauCoursier(
  client: SupabaseClient,
  coursierId: string,
  niveauId: string,
  administrateurId?: string
): Promise<void> {
  const { error } = await client.rpc("definir_niveau_coursier", {
    p_coursier_id: coursierId,
    p_niveau_id: niveauId,
    p_administrateur_id: administrateurId ?? null,
  });
  if (error) throw error;
}
