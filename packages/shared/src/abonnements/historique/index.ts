import type { SupabaseClient } from "@supabase/supabase-js";
import { historiqueAbonnementFromRow, type HistoriqueAbonnementRow } from "../../supabase/mappers";
import type { ActionHistoriqueAbonnement, HistoriqueAbonnement } from "./types";

export * from "./types";

export async function getHistoriqueAbonnements(
  client: SupabaseClient,
  params?: { commerceId?: string; action?: ActionHistoriqueAbonnement; dateDebut?: string; dateFin?: string }
): Promise<HistoriqueAbonnement[]> {
  let requete = client.from("historique_abonnements").select("*").order("created_at", { ascending: false });
  if (params?.commerceId) requete = requete.eq("commerce_id", params.commerceId);
  if (params?.action) requete = requete.eq("action", params.action);
  if (params?.dateDebut) requete = requete.gte("created_at", params.dateDebut);
  if (params?.dateFin) requete = requete.lte("created_at", params.dateFin);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as HistoriqueAbonnementRow[]).map(historiqueAbonnementFromRow);
}
