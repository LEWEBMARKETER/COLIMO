// Point d'entrée pour la confirmation automatique d'un paiement mobile
// money — SCAFFOLD : aucun fournisseur réel (Airtel Money/Moov Money) n'est
// branché à ce jour dans cet environnement (pas d'identifiants API). Cette
// fonction attend un corps déjà normalisé au format COLIMO ci-dessous ; un
// vrai fournisseur envoie presque toujours son propre format et son propre
// mécanisme de signature — le jour où des identifiants réels sont
// disponibles, ajoutez UNIQUEMENT un petit adaptateur en tête de ce fichier
// qui convertit le payload réel du fournisseur vers `CorpsWebhookNormalise`
// et vérifie sa signature selon leur méthode, plutôt que de réécrire toute
// la logique ci-dessous (déjà correcte : journalisation, idempotence,
// mise à jour de la course).
//
// Tant que configuration_paiements_automatiques.actif est false (valeur par
// défaut, 0040), le flux manuel existant (déclaration client + validation
// admin) reste le seul chemin actif — cette fonction ne fait alors rien.
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

interface CorpsWebhookNormalise {
  paiementId: string;
  transactionExterneId: string;
  montantPaye: number;
  fournisseur: "airtel_money" | "moov_money";
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ erreur: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secretAttendu = process.env.PAIEMENT_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !secretAttendu) {
    res.status(500).json({ erreur: "Configuration serveur incomplète (paiement automatique non configuré)." });
    return;
  }

  // Vérification d'authenticité minimale (secret partagé) — à remplacer par
  // le mécanisme de signature réel du fournisseur une fois connu (HMAC sur
  // le corps brut, la plupart du temps).
  const secretRecu = req.headers["x-colimo-webhook-secret"];
  if (secretRecu !== secretAttendu) {
    res.status(401).json({ erreur: "Signature invalide." });
    return;
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const corps = (req.body ?? {}) as Partial<CorpsWebhookNormalise>;

  const { data: config } = await serviceClient.from("configuration_paiements_automatiques").select("*").eq("id", 1).maybeSingle();

  const { data: webhookLog } = await serviceClient
    .from("webhooks_paiement")
    .insert({ fournisseur: corps.fournisseur ?? "inconnu", payload: corps })
    .select()
    .single();

  if (!config?.actif) {
    if (webhookLog) {
      await serviceClient
        .from("webhooks_paiement")
        .update({ erreur: "Paiement automatique désactivé (configuration_paiements_automatiques.actif = false)." })
        .eq("id", webhookLog.id);
    }
    // 200 volontaire : on accuse réception pour éviter que le fournisseur
    // ne retente indéfiniment un webhook qu'on choisit de ne pas traiter.
    res.status(200).json({ traite: false });
    return;
  }

  if (!corps.paiementId || !corps.transactionExterneId || typeof corps.montantPaye !== "number") {
    if (webhookLog) {
      await serviceClient.from("webhooks_paiement").update({ erreur: "Corps de requête incomplet." }).eq("id", webhookLog.id);
    }
    res.status(400).json({ erreur: "Corps de requête incomplet." });
    return;
  }

  const { error: erreurRpc } = await serviceClient.rpc("confirmer_paiement_automatique", {
    p_paiement_id: corps.paiementId,
    p_transaction_externe_id: corps.transactionExterneId,
    p_montant_paye: corps.montantPaye,
  });

  if (webhookLog) {
    await serviceClient
      .from("webhooks_paiement")
      .update({ traite: !erreurRpc, erreur: erreurRpc?.message ?? null })
      .eq("id", webhookLog.id);
  }

  if (erreurRpc) {
    res.status(500).json({ erreur: "Impossible de confirmer le paiement." });
    return;
  }

  res.status(200).json({ traite: true });
}
