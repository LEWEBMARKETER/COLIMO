"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import { getCommunications, getModelesCommunication, patchModeleCommunication } from "@/lib/api";
import {
  CANAL_COMMUNICATION_LABELS,
  STATUT_COMMUNICATION_LABELS,
  calculerStatistiques,
  getFournisseurEmail,
  getFournisseurPush,
  getFournisseurSMS,
  getFournisseurWhatsApp,
  type CanalCommunication,
  type CommunicationEnvoyee,
  type ModeleCommunication,
  type StatutCommunication,
} from "@colimo/shared";

const SECTIONS = [
  "dashboard",
  "emails",
  "sms",
  "whatsapp",
  "push",
  "templates",
  "historique",
  "statistiques",
  "parametres",
] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  dashboard: "Dashboard",
  emails: "Emails",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
  templates: "Templates",
  historique: "Historique",
  statistiques: "Statistiques",
  parametres: "Paramètres",
};

const CANAL_PAR_SECTION: Partial<Record<Section, CanalCommunication>> = {
  emails: "email",
  sms: "sms",
  whatsapp: "whatsapp",
  push: "push",
};

const STATUTS_FILTRE: StatutCommunication[] = ["en_attente", "envoye", "livre", "lu", "echec"];

export default function CommunicationPage() {
  const [communications, setCommunications] = useState<CommunicationEnvoyee[]>([]);
  const [modeles, setModeles] = useState<ModeleCommunication[]>([]);
  const [chargement, setChargement] = useState(true);
  const [section, setSection] = useState<Section>("dashboard");

  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<StatutCommunication | "tous">("tous");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  useEffect(() => {
    Promise.all([getCommunications(), getModelesCommunication()])
      .then(([c, m]) => {
        setCommunications(c);
        setModeles(m);
      })
      .finally(() => setChargement(false));
  }, []);

  async function rechercherHistorique() {
    setChargement(true);
    try {
      const resultats = await getCommunications({
        statut: filtreStatut === "tous" ? undefined : filtreStatut,
        dateDebut: dateDebut ? new Date(dateDebut).toISOString() : undefined,
        dateFin: dateFin ? new Date(dateFin).toISOString() : undefined,
        recherche: recherche.trim() || undefined,
      });
      setCommunications(resultats);
    } finally {
      setChargement(false);
    }
  }

  const statistiques = useMemo(() => calculerStatistiques(communications), [communications]);

  const communicationsAffichees = useMemo(() => {
    const canal = CANAL_PAR_SECTION[section];
    return canal ? communications.filter((c) => c.canal === canal) : communications;
  }, [communications, section]);

  function commencerEdition(modele: ModeleCommunication) {
    setEnEdition(modele.id);
    setBrouillon(modele.contenu);
  }

  async function enregistrerModele(modele: ModeleCommunication) {
    const misAJour = await patchModeleCommunication(modele.id, { contenu: brouillon });
    setModeles((prev) => prev.map((m) => (m.id === modele.id ? misAJour : m)));
    setEnEdition(null);
  }

  async function toggleActif(modele: ModeleCommunication) {
    const misAJour = await patchModeleCommunication(modele.id, { actif: !modele.actif });
    setModeles((prev) => prev.map((m) => (m.id === modele.id ? misAJour : m)));
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Communication Center</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Centralise tous les envois Email, SMS, WhatsApp et Push de la plateforme. Aucun fournisseur externe
        n&apos;est connecté pour l&apos;instant (fournisseurs mock — les envois sont simulés).
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-colimo-neutre-clair">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              section === s
                ? "border-colimo-rouge text-colimo-rouge"
                : "border-transparent text-colimo-neutre-fonce/60 hover:text-colimo-neutre-fonce"
            }`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {section === "dashboard" && (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Communications envoyées" value={String(statistiques.total)} sombre />
            {(["email", "sms", "whatsapp", "push"] as CanalCommunication[]).map((canal) => (
              <StatCard
                key={canal}
                label={CANAL_COMMUNICATION_LABELS[canal]}
                value={`${statistiques.parCanal[canal].envoyes} envoyés · ${statistiques.parCanal[canal].tauxReussite}%`}
              />
            ))}
          </div>
        </div>
      )}

      {(section === "emails" || section === "sms" || section === "whatsapp" || section === "push") && (
        <TableCommunications communications={communicationsAffichees} chargement={chargement} />
      )}

      {section === "templates" && (
        <div className="mt-6 flex flex-col gap-4">
          {modeles.map((modele) => (
            <div key={modele.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-colimo-neutre-fonce">{modele.nom}</p>
                  <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                    {CANAL_COMMUNICATION_LABELS[modele.canal]} · code : {modele.code}
                    {modele.sujet && <> · sujet : {modele.sujet}</>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatutBadge statut={modele.actif ? "actif" : "hors_ligne"} label={modele.actif ? "Actif" : "Inactif"} />
                  <button
                    onClick={() => toggleActif(modele)}
                    className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                  >
                    {modele.actif ? "Désactiver" : "Activer"}
                  </button>
                </div>
              </div>

              {enEdition === modele.id ? (
                <div className="mt-3">
                  <textarea
                    value={brouillon}
                    onChange={(e) => setBrouillon(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm text-colimo-neutre-fonce"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => enregistrerModele(modele)}
                      className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEnEdition(null)}
                      className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-start justify-between gap-4">
                  <pre className="whitespace-pre-wrap font-texte text-sm text-colimo-neutre-fonce/70">
                    {modele.contenu}
                  </pre>
                  <button
                    onClick={() => commencerEdition(modele)}
                    className="shrink-0 rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                  >
                    Modifier
                  </button>
                </div>
              )}

              {modele.variables.length > 0 && (
                <p className="mt-2 text-xs text-colimo-neutre-fonce/40">
                  Variables : {modele.variables.map((v) => `{{${v}}}`).join(", ")}
                </p>
              )}
            </div>
          ))}
          {!chargement && modeles.length === 0 && (
            <p className="text-center text-sm text-colimo-neutre-fonce/50">Aucun modèle</p>
          )}
        </div>
      )}

      {section === "historique" && (
        <div>
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Rechercher</label>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Destinataire ou contenu"
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Statut</label>
              <select
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value as StatutCommunication | "tous")}
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              >
                <option value="tous">Tous les statuts</option>
                {STATUTS_FILTRE.map((s) => (
                  <option key={s} value={s}>
                    {STATUT_COMMUNICATION_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              />
            </div>
            <button
              onClick={rechercherHistorique}
              className="rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Rechercher
            </button>
          </div>

          <TableCommunications communications={communications} chargement={chargement} />
        </div>
      )}

      {section === "statistiques" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["email", "sms", "whatsapp", "push"] as CanalCommunication[]).map((canal) => {
              const s = statistiques.parCanal[canal];
              return (
                <div key={canal} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
                  <p className="font-medium text-colimo-neutre-fonce">{CANAL_COMMUNICATION_LABELS[canal]}</p>
                  <dl className="mt-3 flex flex-col gap-1.5 text-sm text-colimo-neutre-fonce/70">
                    <div className="flex justify-between">
                      <dt>Envoyés</dt>
                      <dd className="font-medium text-colimo-neutre-fonce">{s.envoyes}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Échoués</dt>
                      <dd className="font-medium text-colimo-neutre-fonce">{s.echoues}</dd>
                    </div>
                    {canal === "whatsapp" || canal === "push" ? (
                      <div className="flex justify-between">
                        <dt>{canal === "whatsapp" ? "Lus" : "Ouverts"}</dt>
                        <dd className="font-medium text-colimo-neutre-fonce">{s.lus}</dd>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <dt>Taux de réussite</dt>
                        <dd className="font-medium text-colimo-neutre-fonce">{s.tauxReussite}%</dd>
                      </div>
                    )}
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <p className="mb-3 font-medium text-colimo-neutre-fonce">Communications par jour</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {statistiques.parJour.map((point) => (
                  <div key={point.date} className="flex justify-between text-colimo-neutre-fonce/70">
                    <span>{point.date}</span>
                    <span className="font-medium text-colimo-neutre-fonce">{point.total}</span>
                  </div>
                ))}
                {statistiques.parJour.length === 0 && (
                  <p className="text-colimo-neutre-fonce/50">Aucune donnée</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <p className="mb-3 font-medium text-colimo-neutre-fonce">Communications par mois</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {statistiques.parMois.map((point) => (
                  <div key={point.date} className="flex justify-between text-colimo-neutre-fonce/70">
                    <span>{point.date}</span>
                    <span className="font-medium text-colimo-neutre-fonce">{point.total}</span>
                  </div>
                ))}
                {statistiques.parMois.length === 0 && (
                  <p className="text-colimo-neutre-fonce/50">Aucune donnée</p>
                )}
              </div>
            </div>
          </div>

          <StatCard label="Coût estimé" value="Prévu pour une future version" />
        </div>
      )}

      {section === "parametres" && (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-colimo-neutre-fonce/70">
            Fournisseur actif par canal. Le module Communication Center est totalement découplé du reste de
            l&apos;application : brancher un fournisseur réel (Resend, Airtel/Moov, WhatsApp Business API,
            Firebase...) se fait uniquement dans <code>packages/shared/src/communication/settings</code>, sans
            toucher aux modules métier.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FournisseurCarte canal="email" nom={getFournisseurEmail().nom} />
            <FournisseurCarte canal="sms" nom={getFournisseurSMS().nom} />
            <FournisseurCarte canal="whatsapp" nom={getFournisseurWhatsApp().nom} />
            <FournisseurCarte canal="push" nom={getFournisseurPush().nom} />
          </div>
        </div>
      )}
    </div>
  );
}

function FournisseurCarte({ canal, nom }: { canal: CanalCommunication; nom: string }) {
  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <p className="font-texte text-[11px] font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">
        {CANAL_COMMUNICATION_LABELS[canal]}
      </p>
      <p className="mt-2 font-titre text-lg font-semibold text-colimo-neutre-fonce">{nom}</p>
    </div>
  );
}

function TableCommunications({
  communications,
  chargement,
}: {
  communications: CommunicationEnvoyee[];
  chargement: boolean;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
          <tr>
            <th className="px-4 py-3 font-medium">Canal</th>
            <th className="px-4 py-3 font-medium">Destinataire</th>
            <th className="px-4 py-3 font-medium">Modèle</th>
            <th className="px-4 py-3 font-medium">Contenu</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {communications.map((c) => (
            <tr key={c.id} className="border-b border-colimo-neutre-clair last:border-0">
              <td className="px-4 py-3">{CANAL_COMMUNICATION_LABELS[c.canal]}</td>
              <td className="px-4 py-3">{c.destinataire}</td>
              <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">{c.modeleCode ?? "—"}</td>
              <td className="max-w-xs truncate px-4 py-3 text-colimo-neutre-fonce/70" title={c.contenu}>
                {c.contenu}
              </td>
              <td className="px-4 py-3">
                <StatutBadge statut={c.statut} label={STATUT_COMMUNICATION_LABELS[c.statut]} />
                {c.erreur && <p className="mt-1 text-xs text-colimo-rouge">{c.erreur}</p>}
              </td>
              <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                {new Date(c.createdAt).toLocaleString("fr-FR")}
              </td>
            </tr>
          ))}
          {!chargement && communications.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                Aucune communication
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
