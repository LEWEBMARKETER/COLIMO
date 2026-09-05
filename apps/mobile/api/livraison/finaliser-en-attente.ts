// Tâche planifiée (Vercel Cron, cf. vercel.json) qui finalise automatiquement
// les livraisons confirmées par le coursier mais jamais confirmées par le
// client au-delà du délai configurable (configuration_confirmation_livraison,
// admin) — le coursier n'est jamais bloqué indéfiniment par l'inaction du
// client (besoin section 6). Vercel signe ses appels cron avec
// `Authorization: Bearer $CRON_SECRET` dès que cette variable est définie ;
// on vérifie ce même secret ici.
//
// Note : le plan Vercel Hobby limite la fréquence des cron jobs (souvent à
// une exécution par jour) — l'horaire ci-dessous (toutes les heures) peut
// nécessiter un plan payant. Voir docs/CONFIRMATION_LIVRAISON.md.
import { createClient } from "@supabase/supabase-js";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ erreur: "Configuration serveur incomplète." });
    return;
  }

  if (cronSecret) {
    const enteteAuth = req.headers.authorization;
    if (enteteAuth !== `Bearer ${cronSecret}`) {
      res.status(401).json({ erreur: "Non autorisé." });
      return;
    }
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await serviceClient.rpc("finaliser_livraisons_en_attente");
  if (error) {
    res.status(500).json({ erreur: error.message });
    return;
  }

  res.status(200).json({ finalisees: data });
}
