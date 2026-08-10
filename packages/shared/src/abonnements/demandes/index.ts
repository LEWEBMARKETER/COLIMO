import type { SupabaseClient } from "@supabase/supabase-js";
import { demandeAbonnementFromRow, type DemandeAbonnementRow } from "../../supabase/mappers";
import type { PackPayant } from "../types";
import type { DemandeAbonnement, StatutDemandeAbonnement } from "./types";

export * from "./types";

/**
 * Passe par la RPC demander_activation_abonnement (security definer) plutôt
 * qu'un insert direct : elle résout elle-même le commerce de l'appelant
 * (commerce_id_pour_utilisateur) — aucune policy insert n'existe sur
 * demandes_abonnement (migration 0031).
 */
export async function demanderActivationAbonnement(client: SupabaseClient, pack: PackPayant): Promise<DemandeAbonnement> {
  const { data, error } = await client.rpc("demander_activation_abonnement", { p_pack: pack }).single();
  if (error) throw error;
  return demandeAbonnementFromRow(data as DemandeAbonnementRow);
}

export async function getDemandesAbonnement(
  client: SupabaseClient,
  params?: { commerceId?: string; statut?: StatutDemandeAbonnement }
): Promise<DemandeAbonnement[]> {
  let requete = client.from("demandes_abonnement").select("*").order("created_at", { ascending: false });
  if (params?.commerceId) requete = requete.eq("commerce_id", params.commerceId);
  if (params?.statut) requete = requete.eq("statut", params.statut);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as DemandeAbonnementRow[]).map(demandeAbonnementFromRow);
}

export async function refuserDemandeAbonnement(
  client: SupabaseClient,
  demandeId: string,
  motif?: string
): Promise<DemandeAbonnement> {
  const { data, error } = await client
    .rpc("refuser_demande_abonnement", { p_demande_id: demandeId, p_motif: motif ?? null })
    .single();
  if (error) throw error;
  return demandeAbonnementFromRow(data as DemandeAbonnementRow);
}
