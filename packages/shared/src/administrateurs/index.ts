import type { SupabaseClient } from "@supabase/supabase-js";
import { historiqueInvitationAdminFromRow, type HistoriqueInvitationAdminRow } from "../supabase/mappers";
import type { HistoriqueInvitationAdmin } from "./types";

export * from "./types";

// Lecture seule — l'écriture (invitation d'un nouvel admin) ne se fait
// jamais depuis un client authentifié classique, uniquement via la route
// serveur apps/admin/app/api/administrateurs/route.ts (clé service-role,
// seule habilitée à créer un compte Supabase Auth pour un tiers).
export async function getHistoriqueInvitationsAdmin(client: SupabaseClient): Promise<HistoriqueInvitationAdmin[]> {
  const { data, error } = await client
    .from("historique_invitations_admin")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as HistoriqueInvitationAdminRow[]).map(historiqueInvitationAdminFromRow);
}
