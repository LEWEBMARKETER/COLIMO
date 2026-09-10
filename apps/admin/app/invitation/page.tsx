"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { validerMotDePasse } from "@colimo/shared";
import { createClient } from "@/lib/supabaseClient";
import ChampMotDePasse from "@/components/ChampMotDePasse";

type EtatLien = "verification" | "pret" | "invalide";

// Page d'atterrissage du lien d'invitation envoyé par
// api/administrateurs/route.ts (auth.admin.inviteUserByEmail). Le client
// Supabase détecte et échange automatiquement le jeton présent dans l'URL
// au chargement (detectSessionInUrl, activé par défaut) — même schéma que
// apps/mobile/app/(auth)/reset-password.tsx, adapté à Next.js. Le compte
// utilisateurs (type='admin') a déjà été créé côté serveur au moment de
// l'invitation : il ne reste qu'à définir le mot de passe.
export default function InvitationPage() {
  const router = useRouter();
  const [etatLien, setEtatLien] = useState<EtatLien>("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [reussi, setReussi] = useState(false);

  useEffect(() => {
    let actif = true;
    const client = createClient();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && actif) setEtatLien("pret");
    });

    client.auth.getSession().then(({ data }) => {
      if (actif && data.session) setEtatLien((e) => (e === "verification" ? "pret" : e));
    });

    const delai = setTimeout(() => {
      if (actif) setEtatLien((e) => (e === "verification" ? "invalide" : e));
    }, 3000);

    return () => {
      actif = false;
      subscription.unsubscribe();
      clearTimeout(delai);
    };
  }, []);

  async function valider() {
    setErreur(null);
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const erreurValidation = validerMotDePasse(motDePasse);
    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }
    setEnvoiEnCours(true);
    const client = createClient();
    const { data, error } = await client.auth.updateUser({ password: motDePasse });
    if (error) {
      setEnvoiEnCours(false);
      setErreur("Impossible de définir le mot de passe pour le moment. Réessayez.");
      return;
    }
    // Confirme l'invitation (en_cours -> confirme) — seule transition que
    // le titulaire de la ligne peut faire lui-même (trigger
    // proteger_pole_et_invitation_admin, 0046). Sans ce statut, le
    // middleware bloque toujours l'accès au Back Office même mot de passe
    // défini.
    if (data.user) {
      await client.from("utilisateurs").update({ statut_invitation: "confirme" }).eq("id", data.user.id);
    }
    setEnvoiEnCours(false);
    setReussi(true);
  }

  function accederAuBackOffice() {
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-colimo-fond px-4">
      <div className="w-full max-w-sm rounded-2xl border border-colimo-neutre-clair bg-white p-8 shadow-sm">
        <Image src="/logo-colimo.png" alt="COLIMO" width={200} height={57} priority />
        <p className="mt-3 text-sm text-colimo-neutre-fonce/70">Back-office administrateur</p>

        {etatLien === "verification" && <p className="mt-6 text-sm text-colimo-neutre-fonce/60">Vérification du lien…</p>}

        {etatLien === "invalide" && (
          <div className="mt-6">
            <p className="font-titre text-lg text-colimo-neutre-fonce">Lien invalide ou expiré</p>
            <p className="mt-2 text-sm text-colimo-neutre-fonce/70">
              Ce lien d&apos;invitation n&apos;est plus valide — il a peut-être déjà été utilisé ou a expiré. Contactez
              un autre administrateur pour en recevoir un nouveau.
            </p>
          </div>
        )}

        {etatLien === "pret" && !reussi && (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              valider();
            }}
          >
            <p className="text-sm text-colimo-neutre-fonce/70">
              Bienvenue dans l&apos;équipe COLIMO — définissez votre mot de passe pour activer votre accès
              administrateur.
            </p>
            <div>
              <label className="block text-sm font-medium text-colimo-neutre-fonce">Mot de passe</label>
              <ChampMotDePasse
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="mt-1 w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none focus:ring-1 focus:ring-colimo-rouge"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-colimo-neutre-fonce/50">Au moins 8 caractères, avec une lettre et un chiffre.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-colimo-neutre-fonce">Confirmer le mot de passe</label>
              <ChampMotDePasse
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="mt-1 w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none focus:ring-1 focus:ring-colimo-rouge"
                placeholder="••••••••"
              />
            </div>

            {erreur && <p className="text-sm text-colimo-rouge">{erreur}</p>}

            <button
              type="submit"
              disabled={envoiEnCours}
              className="w-full rounded-lg bg-colimo-rouge px-4 py-2 text-sm font-semibold text-white transition hover:bg-colimo-rouge-fonce disabled:opacity-60"
            >
              {envoiEnCours ? "Enregistrement..." : "Définir mon mot de passe"}
            </button>
          </form>
        )}

        {reussi && (
          <div className="mt-6">
            <p className="font-titre text-lg text-colimo-neutre-fonce">Compte activé</p>
            <p className="mt-2 text-sm text-colimo-neutre-fonce/70">Votre mot de passe a été défini avec succès.</p>
            <button
              onClick={accederAuBackOffice}
              className="mt-6 w-full rounded-lg bg-colimo-rouge px-4 py-2 text-sm font-semibold text-white transition hover:bg-colimo-rouge-fonce"
            >
              Accéder au back-office
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
