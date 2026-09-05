// Branche un vrai fournisseur Push (Web Push/VAPID) sur le Communication
// Center à la place du MockPushProvider par défaut — cf.
// packages/shared/src/communication/providers. N'appeler qu'une seule fois,
// au démarrage de l'app web (apps/mobile/app/_layout.tsx). Chaque événement
// "notification_*" continue d'être enregistré dans `notifications` (cloche
// in-app) exactement comme avant ; ce fournisseur ajoute en plus un vrai
// envoi navigateur si le destinataire y est abonné sur au moins un appareil.
import { configurerFournisseurPush, type PushProvider, type ResultatEnvoi } from "@colimo/shared";
import { supabase } from "./supabaseClient";

const WebPushProvider: PushProvider = {
  nom: "Push web (VAPID)",
  async envoyer({ destinataire, titre, contenu }): Promise<ResultatEnvoi> {
    try {
      const { data } = await supabase.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) return { succes: false, erreur: "Session absente." };

      const reponse = await fetch("/api/push/envoyer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({ utilisateurId: destinataire, titre, contenu }),
      });
      if (!reponse.ok) return { succes: false, erreur: `Erreur ${reponse.status}` };
      return { succes: true };
    } catch (e) {
      return { succes: false, erreur: e instanceof Error ? e.message : "Erreur inconnue" };
    }
  },
};

export function initialiserFournisseurPush(): void {
  configurerFournisseurPush(WebPushProvider);
}
