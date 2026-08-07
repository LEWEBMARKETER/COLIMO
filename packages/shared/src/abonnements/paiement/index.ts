import type { SupabaseClient } from "@supabase/supabase-js";
import { configurationPaiementAbonnementFromRow, type ConfigurationPaiementAbonnementRow } from "../../supabase/mappers";
import type { ConfigurationPaiementAbonnement } from "./types";

export * from "./types";

export async function getConfigurationPaiementAbonnement(client: SupabaseClient): Promise<ConfigurationPaiementAbonnement> {
  const { data, error } = await client.from("configuration_paiement_abonnements").select("*").eq("id", 1).single();
  if (error) throw error;
  return configurationPaiementAbonnementFromRow(data as ConfigurationPaiementAbonnementRow);
}

export async function patchConfigurationPaiementAbonnement(
  client: SupabaseClient,
  body: {
    numeroPaiement?: string;
    nomBeneficiaire?: string;
    moyenPaiement?: string;
    instructions?: string;
    whatsapp?: string;
    emailContact?: string;
  }
): Promise<ConfigurationPaiementAbonnement> {
  const update: Record<string, unknown> = {};
  if (body.numeroPaiement !== undefined) update.numero_paiement = body.numeroPaiement;
  if (body.nomBeneficiaire !== undefined) update.nom_beneficiaire = body.nomBeneficiaire;
  if (body.moyenPaiement !== undefined) update.moyen_paiement = body.moyenPaiement;
  if (body.instructions !== undefined) update.instructions = body.instructions;
  if (body.whatsapp !== undefined) update.whatsapp = body.whatsapp;
  if (body.emailContact !== undefined) update.email_contact = body.emailContact;

  const { data, error } = await client
    .from("configuration_paiement_abonnements")
    .update(update)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return configurationPaiementAbonnementFromRow(data as ConfigurationPaiementAbonnementRow);
}
