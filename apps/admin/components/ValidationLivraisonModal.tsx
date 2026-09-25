import { useState } from "react";
import {
  METHODE_VERIFICATION_LIVRAISON_LABELS,
  RESULTAT_VERIFICATION_LIVRAISON_LABELS,
  type Course,
  type MethodeVerificationLivraison,
  type ResultatVerificationLivraison,
} from "@colimo/shared";
import { validerLivraisonAdmin } from "@/lib/api";

const METHODES: MethodeVerificationLivraison[] = [
  "client_contacte",
  "coursier_contacte",
  "client_et_coursier_contactes",
  "preuve_verifiee",
  "autre",
];

const RESULTATS: ResultatVerificationLivraison[] = ["confirmee", "contestee", "impossible"];

interface ValidationLivraisonModalProps {
  course: Course;
  onClose: () => void;
  onValide: (course: Course) => void;
}

// Solution de secours quand ni le client ni le coursier n'a effectué la
// confirmation finale — l'admin vérifie humainement (généralement par
// téléphone) puis tranche. Réservée aux courses "livree" (= "livraison à
// confirmer" du besoin) ; la RPC valider_livraison_admin revérifie tout
// côté serveur, ce panneau n'est qu'une interface.
export default function ValidationLivraisonModal({ course, onClose, onValide }: ValidationLivraisonModalProps) {
  const [methode, setMethode] = useState<MethodeVerificationLivraison | "">("");
  const [resultat, setResultat] = useState<ResultatVerificationLivraison | "">("");
  const [note, setNote] = useState("");
  const [etapeFinale, setEtapeFinale] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const noteObligatoire = resultat !== "confirmee" || methode === "autre";
  const formulaireValide = Boolean(methode && resultat && (!noteObligatoire || note.trim()));

  async function envoyer() {
    if (!methode || !resultat || !formulaireValide) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const misAJour = await validerLivraisonAdmin({
        courseId: course.id,
        methode,
        resultat,
        note: note.trim() || undefined,
      });
      onValide(misAJour);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer cette validation.");
      setEtapeFinale(false);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function valider() {
    if (!formulaireValide) return;
    // Étape de confirmation supplémentaire uniquement pour la clôture
    // définitive de la course (besoin section 5) — contester ou constater
    // une vérification impossible ne ferme rien, donc n'a pas besoin de ce
    // second verrou.
    if (resultat === "confirmee" && !etapeFinale) {
      setEtapeFinale(true);
      return;
    }
    envoyer();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {etapeFinale ? (
          <>
            <h2 className="font-titre text-lg font-semibold text-colimo-neutre-fonce">
              Confirmer définitivement cette livraison ?
            </h2>
            <p className="mt-2 text-sm text-colimo-neutre-fonce/70">Cette action clôturera la course.</p>
            {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEtapeFinale(false)}
                disabled={envoiEnCours}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={envoyer}
                disabled={envoiEnCours}
                className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
              >
                {envoiEnCours ? "Confirmation…" : "Confirmer la livraison"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-titre text-lg font-semibold text-colimo-neutre-fonce">Confirmer cette livraison</h2>
                <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">Course : {course.numeroCommande}</p>
              </div>
              <button onClick={onClose} className="text-xs text-colimo-neutre-fonce/50 hover:text-colimo-rouge">
                Fermer
              </button>
            </div>
            <p className="mt-3 text-sm text-colimo-neutre-fonce/70">
              Confirmez que vous avez vérifié que cette livraison a bien été effectuée.
            </p>

            <label className="mt-4 block text-xs font-medium text-colimo-neutre-fonce/60">Méthode de vérification</label>
            <select
              value={methode}
              onChange={(e) => setMethode(e.target.value as MethodeVerificationLivraison)}
              className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              <option value="">Choisir…</option>
              {METHODES.map((m) => (
                <option key={m} value={m}>
                  {METHODE_VERIFICATION_LIVRAISON_LABELS[m]}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-colimo-neutre-fonce/60">Résultat de la vérification</label>
            <select
              value={resultat}
              onChange={(e) => setResultat(e.target.value as ResultatVerificationLivraison)}
              className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              <option value="">Choisir…</option>
              {RESULTATS.map((r) => (
                <option key={r} value={r}>
                  {RESULTAT_VERIFICATION_LIVRAISON_LABELS[r]}
                </option>
              ))}
            </select>

            <label className="mt-3 block text-xs font-medium text-colimo-neutre-fonce/60">
              Note administrative {noteObligatoire ? "(obligatoire)" : "(facultative)"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ex. Client joint par téléphone à 15h32. Confirme avoir reçu son colis."
              className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            />

            {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onClose}
                disabled={envoiEnCours}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={!formulaireValide || envoiEnCours}
                className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
              >
                {envoiEnCours ? "Envoi…" : "Valider"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
