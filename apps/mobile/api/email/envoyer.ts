// Envoie un email réel via l'API Resend — appelé par ResendEmailProvider
// (apps/mobile/lib/emailProvider.ts), lui-même branché sur le Communication
// Center (packages/shared/src/communication) à la place du fournisseur mock
// par défaut. La clé RESEND_API_KEY ne quitte jamais ce fichier. Distinct du
// formulaire de contact (api/support/contact.ts, SMTP direct vers la boîte
// contact@colimo.online) : ceci envoie les notifications automatiques DE
// Colimo VERS un utilisateur (bienvenue, course créée...), en volume
// potentiellement plus élevé — d'où un service transactionnel dédié plutôt
// que le SMTP d'une boîte mail classique.
import { createClient } from "@supabase/supabase-js";

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
  const resendApiKey = process.env.RESEND_API_KEY;
  const expediteur = process.env.RESEND_EMAIL_EXPEDITEUR ?? "COLIMO <notifications@colimo.online>";

  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey) {
    res.status(500).json({ erreur: "Envoi d'email non configuré côté serveur." });
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

  const body = (req.body ?? {}) as { destinataire?: string; sujet?: string; contenu?: string };
  if (!body.destinataire || !body.contenu) {
    res.status(400).json({ erreur: "destinataire et contenu requis." });
    return;
  }

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: expediteur,
        to: body.destinataire,
        subject: body.sujet || "COLIMO",
        text: body.contenu,
      }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => "");
      res.status(502).json({ erreur: `Resend a refusé l'envoi (${reponse.status}) : ${detail}` });
      return;
    }

    res.status(200).json({ envoye: true });
  } catch (e) {
    res.status(502).json({ erreur: e instanceof Error ? e.message : "Impossible de contacter Resend." });
  }
}
