import type { SupabaseClient } from "@supabase/supabase-js";
import { historiqueSuppressionCompteFromRow, type HistoriqueSuppressionCompteRow } from "../supabase/mappers";
import type { HistoriqueSuppressionCompte } from "./types";

export * from "./types";

// Lecture seule — l'écriture (suppression/anonymisation réelle) ne se fait
// jamais depuis un client authentifié classique, uniquement via la route
// serveur apps/admin/app/api/utilisateurs/[id]/route.ts (clé service-role,
// seule habilitée à appeler l'API Admin Supabase Auth).
export async function getHistoriqueSuppressionsComptes(client: SupabaseClient): Promise<HistoriqueSuppressionCompte[]> {
  const { data, error } = await client
    .from("historique_suppressions_compte")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HistoriqueSuppressionCompteRow[]).map(historiqueSuppressionCompteFromRow);
}
