import type { SupabaseClient } from "@supabase/supabase-js";
import {
  historiqueActionAdminFromRow,
  historiqueInvitationAdminFromRow,
  type HistoriqueActionAdminRow,
  type HistoriqueInvitationAdminRow,
} from "../supabase/mappers";
import type { HistoriqueActionAdmin, HistoriqueInvitationAdmin } from "./types";

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

// Journal d'audit des actions d'administration — lecture réservée au Super
// Admin (RLS, 0046). L'écriture se fait uniquement depuis les routes
// serveur apps/admin/app/api/administrateurs/** (clé service-role).
export async function getHistoriqueActionsAdmin(client: SupabaseClient): Promise<HistoriqueActionAdmin[]> {
  const { data, error } = await client
    .from("historique_actions_admin")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as HistoriqueActionAdminRow[]).map(historiqueActionAdminFromRow);
}
