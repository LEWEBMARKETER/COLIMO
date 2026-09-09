// Branche un vrai fournisseur Email (Resend) sur le Communication Center à
// la place du MockEmailProvider par défaut — équivalent admin de
// apps/mobile/lib/emailProvider.ts (même compte Resend, même domaine
// vérifié, endpoint serveur distinct car ceci est une app Next.js séparée).
import { configurerFournisseurEmail, type EmailProvider, type ResultatEnvoi } from "@colimo/shared";
import { createClient } from "./supabaseClient";

const ResendEmailProvider: EmailProvider = {
  nom: "Email (Resend)",
  async envoyer({ destinataire, sujet, contenu }): Promise<ResultatEnvoi> {
    try {
      const client = createClient();
      const { data } = await client.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) return { succes: false, erreur: "Session absente." };

      const reponse = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` },
        body: JSON.stringify({ destinataire, sujet, contenu }),
      });
      if (!reponse.ok) return { succes: false, erreur: `Erreur ${reponse.status}` };
      return { succes: true };
    } catch (e) {
      return { succes: false, erreur: e instanceof Error ? e.message : "Erreur inconnue" };
    }
  },
};

export function initialiserFournisseurEmail(): void {
  configurerFournisseurEmail(ResendEmailProvider);
}
