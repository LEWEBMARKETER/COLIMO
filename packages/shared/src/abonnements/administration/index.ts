import type { SupabaseClient } from "@supabase/supabase-js";
import { commercantFromRow, type CommercantRow } from "../../supabase/mappers";
import type { Commercant } from "../../types";
import type { PackPayant } from "../types";

/**
 * Réservées à l'admin (vérifié côté serveur dans chaque RPC, migration
 * 0034) — activent/désactivent le forfait ET écrivent historique_abonnements
 * dans la même transaction. dateDebut/dureeJours omis laissent la RPC
 * appliquer ses valeurs par défaut (aujourd'hui, 30 jours).
 */
export async function activerAbonnementCommerce(
  client: SupabaseClient,
  input: { commerceId: string; pack: PackPayant; dateDebut?: string; dureeJours?: number; motif?: string }
): Promise<Commercant> {
  const { data, error } = await client
    .rpc("activer_abonnement_commerce", {
      p_commerce_id: input.commerceId,
      p_pack: input.pack,
      p_date_debut: input.dateDebut ?? undefined,
      p_duree_jours: input.dureeJours ?? undefined,
      p_motif: input.motif ?? null,
    })
    .single();
  if (error) throw error;
  return commercantFromRow(data as CommercantRow);
}

export async function desactiverAbonnementCommerce(
  client: SupabaseClient,
  commerceId: string,
  motif?: string
): Promise<Commercant> {
  const { data, error } = await client
    .rpc("desactiver_abonnement_commerce", { p_commerce_id: commerceId, p_motif: motif ?? null })
    .single();
  if (error) throw error;
  return commercantFromRow(data as CommercantRow);
}

export async function suspendreAbonnementCommerce(
  client: SupabaseClient,
  commerceId: string,
  motif?: string
): Promise<Commercant> {
  const { data, error } = await client
    .rpc("suspendre_abonnement_commerce", { p_commerce_id: commerceId, p_motif: motif ?? null })
    .single();
  if (error) throw error;
  return commercantFromRow(data as CommercantRow);
}

export async function reactiverAbonnementCommerce(
  client: SupabaseClient,
  commerceId: string,
  motif?: string
): Promise<Commercant> {
  const { data, error } = await client
    .rpc("reactiver_abonnement_commerce", { p_commerce_id: commerceId, p_motif: motif ?? null })
    .single();
  if (error) throw error;
  return commercantFromRow(data as CommercantRow);
}
