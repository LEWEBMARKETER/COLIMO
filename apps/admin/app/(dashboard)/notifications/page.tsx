"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import { getModelesNotification, getNotifications, patchModeleNotification } from "@/lib/api";
import {
  STATUT_NOTIFICATION_LABELS,
  TYPE_NOTIFICATION_LABELS,
  type ModeleNotification,
  type NotificationEnvoyee,
} from "@colimo/shared";

const ONGLETS = ["sms", "whatsapp", "email", "push", "historique", "modeles"] as const;
type Onglet = (typeof ONGLETS)[number];

const ONGLET_LABELS: Record<Onglet, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  email: "Emails",
  push: "Push",
  historique: "Historique",
  modeles: "Modèles",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationEnvoyee[]>([]);
  const [modeles, setModeles] = useState<ModeleNotification[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<Onglet>("historique");
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");

  useEffect(() => {
    Promise.all([getNotifications(), getModelesNotification()])
      .then(([n, m]) => {
        setNotifications(n);
        setModeles(m);
      })
      .finally(() => setChargement(false));
  }, []);

  const stats = useMemo(() => {
    const envoye = notifications.filter((n) => n.statut === "envoye" || n.statut === "livre" || n.statut === "lu").length;
    const enAttente = notifications.filter((n) => n.statut === "en_attente").length;
    const echec = notifications.filter((n) => n.statut === "echec").length;
    const total = notifications.length;
    const tauxReussite = total > 0 ? Math.round((envoye / total) * 100) : 0;
    return { envoye, enAttente, echec, tauxReussite };
  }, [notifications]);

  const notificationsFiltrees = useMemo(() => {
    if (onglet === "historique" || onglet === "modeles") return notifications;
    return notifications.filter((n) => n.type === onglet);
  }, [notifications, onglet]);

  function commencerEdition(modele: ModeleNotification) {
    setEnEdition(modele.id);
    setBrouillon(modele.contenu);
  }

  async function enregistrerModele(modele: ModeleNotification) {
    const misAJour = await patchModeleNotification(modele.id, { contenu: brouillon });
    setModeles((prev) => prev.map((m) => (m.id === modele.id ? misAJour : m)));
    setEnEdition(null);
  }

  async function toggleActif(modele: ModeleNotification) {
    const misAJour = await patchModeleNotification(modele.id, { actif: !modele.actif });
    setModeles((prev) => prev.map((m) => (m.id === modele.id ? misAJour : m)));
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Notifications</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        SMS, WhatsApp, Email et Push — historique et modèles de messages. Aucun fournisseur externe n&apos;est
        connecté pour l&apos;instant (fournisseurs mock).
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Envoyées" value={String(stats.envoye)} />
        <StatCard label="En attente" value={String(stats.enAttente)} />
        <StatCard label="Échouées" value={String(stats.echec)} />
        <StatCard label="Taux de réussite" value={`${stats.tauxReussite}%`} />
        <StatCard label="Coûts estimés" value="À venir" />
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
          </button>
        ))}
      </div>

      {onglet === "modeles" ? (
        <div className="mt-6 flex flex-col gap-4">
          {modeles.map((modele) => (
            <div key={modele.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-colimo-neutre-fonce">{modele.nom}</p>
                  <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                    {TYPE_NOTIFICATION_LABELS[modele.type]} · code : {modele.code}
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
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Destinataire</th>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium">Contenu</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {notificationsFiltrees.map((n) => (
                <tr key={n.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3">{TYPE_NOTIFICATION_LABELS[n.type]}</td>
                  <td className="px-4 py-3">{n.destinataire}</td>
                  <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">{n.modeleCode ?? "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-colimo-neutre-fonce/70" title={n.contenu}>
                    {n.contenu}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={n.statut} label={STATUT_NOTIFICATION_LABELS[n.statut]} />
                    {n.erreur && <p className="mt-1 text-xs text-colimo-rouge">{n.erreur}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                    {new Date(n.createdAt).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {!chargement && notificationsFiltrees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                    Aucune notification
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
