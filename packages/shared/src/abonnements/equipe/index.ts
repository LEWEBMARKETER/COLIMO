import type { SupabaseClient } from "@supabase/supabase-js";
import {
  commerceMembreFromRow,
  invitationCommerceFromRow,
  type CommerceMembreRow,
  type InvitationCommerceRow,
} from "../../supabase/mappers";
import type { CommerceMembre, InvitationCommerce, RoleCommerceMembre } from "./types";

export * from "./types";

/**
 * Réservé au propriétaire principal du commerce, Pack Business (vérifié
 * côté serveur dans la RPC, qui refuse aussi au-delà de 3 utilisateurs
 * supplémentaires — migration 0032).
 */
export async function creerInvitationCommerce(
  client: SupabaseClient,
  role: RoleCommerceMembre = "employe"
): Promise<InvitationCommerce> {
  const { data, error } = await client.rpc("creer_invitation_commerce", { p_role: role }).single();
  if (error) throw error;
  return invitationCommerceFromRow(data as InvitationCommerceRow);
}

/**
 * Appelée juste après l'inscription d'un nouveau compte avec un code
 * d'invitation (apps/mobile/app/(auth)/rejoindre-commerce.tsx) — la RPC
 * revalide le code et la limite de 3 utilisateurs côté serveur.
 */
export async function rejoindreCommerce(client: SupabaseClient, code: string): Promise<CommerceMembre> {
  const { data, error } = await client.rpc("rejoindre_commerce", { p_code: code }).single();
  if (error) throw error;
  return commerceMembreFromRow(data as CommerceMembreRow);
}

export async function getMembresCommerce(client: SupabaseClient, commerceId: string): Promise<CommerceMembre[]> {
  const { data, error } = await client
    .from("commerce_membres")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("created_at");
  if (error) throw error;
  return (data as CommerceMembreRow[]).map(commerceMembreFromRow);
}

export async function getInvitationsCommerce(client: SupabaseClient, commerceId: string): Promise<InvitationCommerce[]> {
  const { data, error } = await client
    .from("invitations_commerce")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as InvitationCommerceRow[]).map(invitationCommerceFromRow);
}
