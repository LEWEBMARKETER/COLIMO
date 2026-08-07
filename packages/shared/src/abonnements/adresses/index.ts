import type { SupabaseClient } from "@supabase/supabase-js";
import {
  commerceAdresseFavoriteFromRow,
  commercePointDepartFromRow,
  type CommerceAdresseFavoriteRow,
  type CommercePointDepartRow,
} from "../../supabase/mappers";
import type { Zone } from "../../types";
import type { CommerceAdresseFavorite, CommercePointDepart } from "./types";

export * from "./types";

// --- Adresses favorites (Starter, max 10) -----------------------------

export async function getAdressesFavoritesCommerce(client: SupabaseClient, commerceId: string): Promise<CommerceAdresseFavorite[]> {
  const { data, error } = await client
    .from("commerce_adresses_favorites")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("label");
  if (error) throw error;
  return (data as CommerceAdresseFavoriteRow[]).map(commerceAdresseFavoriteFromRow);
}

export async function creerAdresseFavoriteCommerce(
  client: SupabaseClient,
  input: { commerceId: string; label: string; adresse: string; repere?: string; zone?: Zone }
): Promise<CommerceAdresseFavorite> {
  const { data, error } = await client
    .from("commerce_adresses_favorites")
    .insert({
      commerce_id: input.commerceId,
      label: input.label,
      adresse: input.adresse,
      repere: input.repere ?? null,
      zone: input.zone ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return commerceAdresseFavoriteFromRow(data as CommerceAdresseFavoriteRow);
}

export async function supprimerAdresseFavoriteCommerce(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("commerce_adresses_favorites").delete().eq("id", id);
  if (error) throw error;
}

// --- Points de départ (Business) ---------------------------------------

export async function getPointsDepartCommerce(client: SupabaseClient, commerceId: string): Promise<CommercePointDepart[]> {
  const { data, error } = await client
    .from("commerce_points_depart")
    .select("*")
    .eq("commerce_id", commerceId)
    .order("label");
  if (error) throw error;
  return (data as CommercePointDepartRow[]).map(commercePointDepartFromRow);
}

export async function creerPointDepartCommerce(
  client: SupabaseClient,
  input: {
    commerceId: string;
    label: string;
    adresse: string;
    repere?: string;
    zone?: Zone;
    latitude?: number;
    longitude?: number;
  }
): Promise<CommercePointDepart> {
  const { data, error } = await client
    .from("commerce_points_depart")
    .insert({
      commerce_id: input.commerceId,
      label: input.label,
      adresse: input.adresse,
      repere: input.repere ?? null,
      zone: input.zone ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return commercePointDepartFromRow(data as CommercePointDepartRow);
}

export async function supprimerPointDepartCommerce(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("commerce_points_depart").delete().eq("id", id);
  if (error) throw error;
}
