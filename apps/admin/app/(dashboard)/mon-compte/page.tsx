"use client";

import { useEffect, useState } from "react";
import { validerMotDePasse } from "@colimo/shared";
import { createClient } from "@/lib/supabaseClient";

export default function MonComptePage() {
  const [emailActuel, setEmailActuel] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);

  const [nouvelEmail, setNouvelEmail] = useState("");
  const [motDePasseEmail, setMotDePasseEmail] = useState("");
  const [erreurEmail, setErreurEmail] = useState<string | null>(null);
  const [succesEmail, setSuccesEmail] = useState(false);
  const [envoiEmailEnCours, setEnvoiEmailEnCours] = useState(false);

  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState("");
  const [erreurMotDePasse, setErreurMotDePasse] = useState<string | null>(null);
  const [succesMotDePasse, setSuccesMotDePasse] = useState(false);
  const [envoiMotDePasseEnCours, setEnvoiMotDePasseEnCours] = useState(false);

  useEffect(() => {
    const client = createClient();
    client.auth.getUser().then(({ data }) => {
      setEmailActuel(data.user?.email ?? null);
      setChargement(false);
    });
  }, []);

  async function changerEmail() {
    setErreurEmail(null);
    setSuccesEmail(false);
    if (!emailActuel) return;
    if (!motDePasseEmail) {
      setErreurEmail("Confirmez avec votre mot de passe actuel.");
      return;
    }
    setEnvoiEmailEnCours(true);
    try {
      const client = createClient();
      // Ré-authentification obligatoire avant toute modification sensible du
      // compte — empêche qu'une session laissée ouverte sur un poste partagé
      // permette de changer l'email sans reconnaître le mot de passe.
      const { error: erreurReauth } = await client.auth.signInWithPassword({
        email: emailActuel,
        password: motDePasseEmail,
      });
      if (erreurReauth) {
        setErreurEmail("Mot de passe actuel incorrect.");
        return;
      }
      const { error } = await client.auth.updateUser({ email: nouvelEmail.trim() });
      if (error) {
        setErreurEmail(error.message);
        return;
      }
      setSuccesEmail(true);
      setMotDePasseEmail("");
      setNouvelEmail("");
    } catch {
      setErreurEmail("Impossible de modifier l'email pour le moment. Réessayez.");
    } finally {
      setEnvoiEmailEnCours(false);
    }
  }

  async function changerMotDePasse() {
    setErreurMotDePasse(null);
    setSuccesMotDePasse(false);
    if (!emailActuel) return;
    if (nouveauMotDePasse !== confirmationMotDePasse) {
      setErreurMotDePasse("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const erreurValidation = validerMotDePasse(nouveauMotDePasse);
    if (erreurValidation) {
      setErreurMotDePasse(erreurValidation);
      return;
    }
    setEnvoiMotDePasseEnCours(true);
    try {
      const client = createClient();
      const { error: erreurReauth } = await client.auth.signInWithPassword({
        email: emailActuel,
        password: motDePasseActuel,
      });
      if (erreurReauth) {
        setErreurMotDePasse("Mot de passe actuel incorrect.");
        return;
      }
      const { error } = await client.auth.updateUser({ password: nouveauMotDePasse });
      if (error) {
        setErreurMotDePasse(error.message);
        return;
      }
      setSuccesMotDePasse(true);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmationMotDePasse("");
    } catch {
      setErreurMotDePasse("Impossible de modifier le mot de passe pour le moment. Réessayez.");
    } finally {
      setEnvoiMotDePasseEnCours(false);
    }
  }

  if (chargement) {
    return <p className="text-sm text-colimo-neutre-fonce/60">Chargement…</p>;
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Mon compte</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Email actuel : {emailActuel}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Changer d&apos;adresse email</h2>
          <p className="mt-1 text-xs text-colimo-neutre-fonce/60">
            Un email de confirmation sera envoyé à la nouvelle adresse ; le changement ne prend effet qu&apos;après
            confirmation.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={nouvelEmail}
              onChange={(e) => setNouvelEmail(e.target.value)}
              type="email"
              placeholder="Nouvelle adresse email"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
            <input
              value={motDePasseEmail}
              onChange={(e) => setMotDePasseEmail(e.target.value)}
              type="password"
              placeholder="Mot de passe actuel"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
          </div>
          {erreurEmail && <p className="mt-3 text-sm text-colimo-rouge">{erreurEmail}</p>}
          {succesEmail && (
            <p className="mt-3 text-sm text-emerald-700">
              Email de confirmation envoyé à la nouvelle adresse. Le changement prendra effet une fois confirmé.
            </p>
          )}
          <button
            onClick={changerEmail}
            disabled={envoiEmailEnCours || !nouvelEmail.trim() || !motDePasseEmail}
            className="mt-4 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
          >
            {envoiEmailEnCours ? "Envoi..." : "Changer l'email"}
          </button>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Changer de mot de passe</h2>
          <p className="mt-1 text-xs text-colimo-neutre-fonce/60">Au moins 8 caractères, avec une lettre et un chiffre.</p>
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={motDePasseActuel}
              onChange={(e) => setMotDePasseActuel(e.target.value)}
              type="password"
              placeholder="Mot de passe actuel"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
            <input
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              type="password"
              placeholder="Nouveau mot de passe"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
            <input
              value={confirmationMotDePasse}
              onChange={(e) => setConfirmationMotDePasse(e.target.value)}
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
            />
          </div>
          {erreurMotDePasse && <p className="mt-3 text-sm text-colimo-rouge">{erreurMotDePasse}</p>}
          {succesMotDePasse && <p className="mt-3 text-sm text-emerald-700">Mot de passe modifié avec succès.</p>}
          <button
            onClick={changerMotDePasse}
            disabled={envoiMotDePasseEnCours || !motDePasseActuel || !nouveauMotDePasse || !confirmationMotDePasse}
            className="mt-4 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
          >
            {envoiMotDePasseEnCours ? "Envoi..." : "Changer le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}
