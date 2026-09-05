import type { SupabaseClient } from "@supabase/supabase-js";
import type { AbonnementPush } from "./types";

export * from "./types";

interface AbonnementPushRow {
  id: string;
  utilisateur_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

function abonnementPushFromRow(row: AbonnementPushRow): AbonnementPush {
  return {
    id: row.id,
    utilisateurId: row.utilisateur_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

// Enregistre (ou transfère au compte courant, si le même appareil/navigateur
// était abonné pour un autre compte) l'abonnement Web Push obtenu via
// registration.pushManager.subscribe() côté app — cf. apps/mobile/lib/push.
export async function enregistrerAbonnementPush(
  client: SupabaseClient,
  params: { utilisateurId: string; endpoint: string; p256dh: string; auth: string; userAgent?: string | null }
): Promise<AbonnementPush> {
  const { data, error } = await client
    .from("push_subscriptions")
    .upsert(
      {
        utilisateur_id: params.utilisateurId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
        user_agent: params.userAgent ?? null,
      },
      { onConflict: "endpoint" }
    )
    .select()
    .single();
  if (error) throw error;
  return abonnementPushFromRow(data as AbonnementPushRow);
}
