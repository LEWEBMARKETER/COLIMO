"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { emailValide } from "@colimo/shared";
import { createClient } from "@/lib/supabaseClient";

const MESSAGE_GENERIQUE =
  "Si un compte administrateur COLIMO est associé à cette adresse, un email contenant les instructions de réinitialisation vient d'être envoyé.";

// Jusqu'ici, un administrateur qui oubliait ou perdait son mot de passe
// n'avait aucun moyen de le récupérer lui-même : /mon-compte exige déjà
// d'être connecté, et /invitation ne fonctionne que pour une première
// activation (en_cours -> confirme). Cette page comble ce manque, sur le
// même principe que apps/mobile/app/(auth)/forgot-password.tsx : message
// générique dans tous les cas, pour ne jamais révéler si une adresse est
// associée à un compte.
export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer() {
    setErreur(null);
    if (!emailValide(email.trim())) {
      setErreur("Adresse email invalide.");
      return;
    }
    setEnvoiEnCours(true);
    const client = createClient();
    await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    // Toujours le même comportement, que le compte existe ou non — jamais
    // exposer quelles adresses ont un accès administrateur.
    setEnvoiEnCours(false);
    setEnvoye(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-colimo-fond px-4">
      <div className="w-full max-w-sm rounded-2xl border border-colimo-neutre-clair bg-white p-8 shadow-sm">
        <Image src="/logo-colimo.png" alt="COLIMO" width={200} height={57} priority />
        <p className="mt-3 text-sm text-colimo-neutre-fonce/70">Back-office administrateur</p>

        {envoye ? (
          <div className="mt-6">
            <p className="font-titre text-lg text-colimo-neutre-fonce">Email envoyé</p>
            <p className="mt-2 text-sm text-colimo-neutre-fonce/70">{MESSAGE_GENERIQUE}</p>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-lg border border-colimo-neutre-clair px-4 py-2 text-center text-sm font-semibold text-colimo-neutre-fonce transition hover:bg-colimo-neutre-clair"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              envoyer();
            }}
          >
            <p className="text-sm text-colimo-neutre-fonce/70">
              Entrez votre adresse email administrateur. Vous recevrez un lien pour définir un nouveau mot de passe.
            </p>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-colimo-neutre-fonce">
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none focus:ring-1 focus:ring-colimo-rouge"
                placeholder="admin@colimo.ga"
              />
            </div>

            {erreur && <p className="text-sm text-colimo-rouge">{erreur}</p>}

            <button
              type="submit"
              disabled={envoiEnCours || !email.trim()}
              className="w-full rounded-lg bg-colimo-rouge px-4 py-2 text-sm font-semibold text-white transition hover:bg-colimo-rouge-fonce disabled:opacity-60"
            >
              {envoiEnCours ? "Envoi..." : "Envoyer le lien de réinitialisation"}
            </button>
            <Link href="/login" className="block text-center text-sm text-colimo-neutre-fonce/60 hover:underline">
              Retour à la connexion
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
