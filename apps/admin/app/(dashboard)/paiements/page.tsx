"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import { getCourses, getPaiements, getUtilisateurs, rejeterPaiement, validerPaiement } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  RESEAU_PAIEMENT_LABELS,
  STATUT_PAIEMENT_LABELS,
  formatFCFA,
  type Course,
  type Paiement,
  type Utilisateur,
} from "@colimo/shared";

const ONGLETS = ["a_valider", "historique"] as const;
type Onglet = (typeof ONGLETS)[number];

const ONGLET_LABELS: Record<Onglet, string> = {
  a_valider: "Paiements à valider",
  historique: "Historique",
};

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<Onglet>("a_valider");
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPaiements(), getCourses(), getUtilisateurs()])
      .then(([p, c, u]) => {
        setPaiements(p);
        setCourses(c);
        setUtilisateurs(u);
      })
      .finally(() => setChargement(false));
  }, []);

  const course = useMemo(() => (id: string) => courses.find((c) => c.id === id), [courses]);
  const utilisateur = useMemo(() => (id: string) => utilisateurs.find((u) => u.id === id), [utilisateurs]);

  const paiementsAffiches = useMemo(
    () => (onglet === "a_valider" ? paiements.filter((p) => p.statut === "en_attente_validation") : paiements),
    [paiements, onglet]
  );

  const enAttenteValidation = paiements.filter((p) => p.statut === "en_attente_validation");
  const montantEnAttente = enAttenteValidation.reduce((total, p) => total + (p.montantPaye ?? p.montantAttendu), 0);
  const confirmesCeMois = paiements.filter((p) => {
    if (p.statut !== "paiement_confirme" || !p.valideAt) return false;
    const d = new Date(p.valideAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  async function valider(paiement: Paiement) {
    if (!window.confirm(`Confirmer le paiement ${paiement.reference} ?`)) return;
    setEnCours(paiement.id);
    try {
      const misAJour = await validerPaiement(paiement.id);
      setPaiements((prev) => prev.map((p) => (p.id === paiement.id ? misAJour : p)));
      const client = utilisateur(paiement.utilisateurId);
      await notifierEvenement("paiement_confirme", {
        destinataire: client?.telephone,
        utilisateurId: paiement.utilisateurId,
        variables: { nom_client: client?.prenom ?? client?.nom ?? "client", reference: paiement.reference },
      });
    } finally {
      setEnCours(null);
    }
  }

  async function rejeter(paiement: Paiement) {
    const motif = window.prompt(`Rejeter le paiement ${paiement.reference} ? Indiquez un motif (optionnel) :`);
    if (motif === null) return;
    setEnCours(paiement.id);
    try {
      const misAJour = await rejeterPaiement(paiement.id, motif || undefined);
      setPaiements((prev) => prev.map((p) => (p.id === paiement.id ? misAJour : p)));
      const client = utilisateur(paiement.utilisateurId);
      await notifierEvenement("paiement_rejete", {
        destinataire: client?.telephone,
        utilisateurId: paiement.utilisateurId,
        variables: { nom_client: client?.prenom ?? client?.nom ?? "client", reference: paiement.reference },
      });
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Paiements</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Paiement manuel Airtel Money — vérification et validation des frais de livraison déclarés par les
        clients et commerçants.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="À valider" value={String(enAttenteValidation.length)} sombre />
        <StatCard label="Montant en attente" value={formatFCFA(montantEnAttente)} />
        <StatCard label="Confirmés ce mois-ci" value={String(confirmesCeMois)} />
      </div>

      <div className="mt-6 flex gap-2 border-b border-colimo-neutre-clair">
        {ONGLETS.map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              onglet === o
                ? "border-colimo-rouge text-colimo-rouge"
                : "border-transparent text-colimo-neutre-fonce/60 hover:text-colimo-neutre-fonce"
            }`}
          >
            {ONGLET_LABELS[o]}
            {o === "a_valider" && enAttenteValidation.length > 0 && (
              <span className="ml-1.5 rounded-full bg-colimo-rouge px-1.5 py-0.5 text-[10px] text-white">
                {enAttenteValidation.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">N° commande</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Réseau</th>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Capture</th>
              <th className="px-4 py-3 font-medium">Déclaré le</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              {onglet === "a_valider" && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paiementsAffiches.map((paiement) => {
              const c = course(paiement.courseId);
              const client = utilisateur(paiement.utilisateurId);
              return (
                <tr key={paiement.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">
                    {c?.numeroCommande ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {client?.prenom ? `${client.prenom} ` : ""}
                    {client?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3">{paiement.numeroPayeur ?? client?.telephone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {formatFCFA(paiement.montantPaye ?? paiement.montantAttendu)}
                    {paiement.montantPaye !== null && paiement.montantPaye !== paiement.montantAttendu && (
                      <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                        Attendu : {formatFCFA(paiement.montantAttendu)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">{paiement.reseau ? RESEAU_PAIEMENT_LABELS[paiement.reseau] : "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">
                    {paiement.reference}
                    {paiement.referenceTransaction && (
                      <p className="mt-0.5 text-colimo-neutre-fonce/50">Txn : {paiement.referenceTransaction}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {paiement.captureUrl ? (
                      <a
                        href={paiement.captureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-colimo-rouge hover:underline"
                      >
                        Voir
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                    {paiement.declareAt ? new Date(paiement.declareAt).toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={paiement.statut} label={STATUT_PAIEMENT_LABELS[paiement.statut]} />
                  </td>
                  {onglet === "a_valider" && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => valider(paiement)}
                          disabled={enCours === paiement.id}
                          className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => rejeter(paiement)}
                          disabled={enCours === paiement.id}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {!chargement && paiementsAffiches.length === 0 && (
              <tr>
                <td colSpan={onglet === "a_valider" ? 10 : 9} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  {onglet === "a_valider" ? "Aucun paiement à valider" : "Aucun paiement"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
