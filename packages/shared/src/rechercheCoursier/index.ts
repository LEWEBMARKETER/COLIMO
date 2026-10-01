import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConfigurationRechercheCoursier } from "./types";

export * from "./types";

interface ConfigurationRechercheCoursierRow {
  delai_recherche_minutes: number;
  intervalles_relance_minutes: number[];
  mis_a_jour_par: string | null;
  mis_a_jour_at: string;
}

function configurationRechercheCoursierFromRow(
  row: ConfigurationRechercheCoursierRow
): ConfigurationRechercheCoursier {
  return {
    delaiRechercheMinutes: row.delai_recherche_minutes,
    intervallesRelanceMinutes: row.intervalles_relance_minutes,
    misAJourParId: row.mis_a_jour_par,
    misAJourAt: row.mis_a_jour_at,
  };
}

// Délai de recherche affiché au client (compteur track/[id].tsx) — jamais
// codé en dur, cf. configuration_recherche_coursier (0057).
export async function getConfigurationRechercheCoursier(
  client: SupabaseClient
): Promise<ConfigurationRechercheCoursier> {
  const { data, error } = await client.from("configuration_recherche_coursier").select("*").eq("id", 1).single();
  if (error) throw error;
  return configurationRechercheCoursierFromRow(data as ConfigurationRechercheCoursierRow);
}

// Réservé à l'admin (RLS, 0057) — permet d'ajuster le délai et les
// intervalles de relance sans redéploiement.
export async function patchConfigurationRechercheCoursier(
  client: SupabaseClient,
  adminId: string,
  body: Partial<{ delaiRechercheMinutes: number; intervallesRelanceMinutes: number[] }>
): Promise<ConfigurationRechercheCoursier> {
  const update: Record<string, unknown> = { mis_a_jour_par: adminId, mis_a_jour_at: new Date().toISOString() };
  if (body.delaiRechercheMinutes !== undefined) update.delai_recherche_minutes = body.delaiRechercheMinutes;
  if (body.intervallesRelanceMinutes !== undefined) update.intervalles_relance_minutes = body.intervallesRelanceMinutes;

  const { data, error } = await client
    .from("configuration_recherche_coursier")
    .update(update)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return configurationRechercheCoursierFromRow(data as ConfigurationRechercheCoursierRow);
}

// Marque que le client a choisi de continuer la recherche après
// expiration du délai indicatif (besoin section 7) — idempotent, sans
// effet si la course n'est plus éligible (coursier déjà attribué, etc.).
export async function prolongerRechercheCoursier(client: SupabaseClient, courseId: string): Promise<void> {
  const { error } = await client.rpc("prolonger_recherche_coursier", { p_course_id: courseId });
  if (error) throw error;
}

// Vérifie si un ou plusieurs intervalles de relance viennent d'être
// franchis pour cette course et pose la garde anti-doublon côté serveur ;
// retourne les intervalles (en minutes) qui viennent de devenir dus.
// L'appelant doit réutiliser notifierMeilleursCoursiers pour chacun —
// jamais une sélection de coursiers dupliquée ici (cf. 0060).
export async function marquerRelancesRechercheDues(client: SupabaseClient, courseId: string): Promise<number[]> {
  const { data, error } = await client.rpc("marquer_relances_recherche_dues", { p_course_id: courseId });
  if (error) throw error;
  return (data as number[] | null) ?? [];
}
