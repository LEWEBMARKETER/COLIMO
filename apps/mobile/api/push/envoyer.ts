// Envoie une notification push web (Web Push/VAPID) à tous les appareils
// abonnés d'un utilisateur — appelé par WebPushProvider
// (apps/mobile/lib/pushProvider.ts), lui-même branché sur le Communication
// Center (packages/shared/src/communication) à la place du fournisseur
// mock par défaut. La clé privée VAPID ne quitte jamais ce fichier.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ erreur: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:contact@colimo.online";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    res.status(500).json({ erreur: "Notifications push non configurées côté serveur." });
    return;
  }

  const enteteAuth = req.headers.authorization;
  const jeton = typeof enteteAuth === "string" ? enteteAuth.replace(/^Bearer\s+/i, "") : null;
  if (!jeton) {
    res.status(401).json({ erreur: "Authentification requise." });
    return;
  }

  const clientAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: utilisateurAuth, error: erreurAuth } = await clientAuth.auth.getUser(jeton);
  if (erreurAuth || !utilisateurAuth.user) {
    res.status(401).json({ erreur: "Session invalide ou expirée." });
    return;
  }

  const body = (req.body ?? {}) as { utilisateurId?: string; titre?: string; contenu?: string; url?: string };
  if (!body.utilisateurId || !body.contenu) {
    res.status(400).json({ erreur: "utilisateurId et contenu requis." });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: abonnements, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .eq("utilisateur_id", body.utilisateurId);
  if (error) {
    res.status(500).json({ erreur: "Impossible de lire les abonnements push." });
    return;
  }
  if (!abonnements || abonnements.length === 0) {
    res.status(200).json({ envoyes: 0 });
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const payload = JSON.stringify({ titre: body.titre ?? "COLIMO", contenu: body.contenu, url: body.url ?? "/" });

  let envoyes = 0;
  for (const abonnement of abonnements) {
    try {
      await webpush.sendNotification(
        { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
        payload
      );
      envoyes++;
    } catch (erreurEnvoi) {
      // Abonnement expiré/révoqué côté navigateur : on le supprime pour ne
      // jamais réessayer indéfiniment un endpoint mort.
      const statut = (erreurEnvoi as { statusCode?: number })?.statusCode;
      if (statut === 404 || statut === 410) {
        await serviceClient.from("push_subscriptions").delete().eq("id", abonnement.id);
      }
    }
  }

  res.status(200).json({ envoyes });
}
