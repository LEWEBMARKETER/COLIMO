"use client";

import { useEffect, useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { getHistoriqueActionsAdmin, getUtilisateurs } from "@/lib/api";
import { ACTION_ADMIN_LABELS, type HistoriqueActionAdmin, type Utilisateur } from "@colimo/shared";

// Journal d'audit des actions d'administration (invitation, changement de
// rôle, suspension/réactivation...) — réservé au Super Admin, à la fois par
// le middleware (page dans PAGES_PAR_POLE.super_admin uniquement) et par la
// RLS de historique_actions_admin (0046, current_pole_admin() = 'super_admin').
export default function JournalActivitePage() {
  const [actions, setActions] = useState<HistoriqueActionAdmin[]>([]);
  const [administrateurs, setAdministrateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    Promise.all([getHistoriqueActionsAdmin(), getUtilisateurs()])
      .then(([lesActions, utilisateurs]) => {
        setActions(lesActions);
        setAdministrateurs(utilisateurs.filter((u) => u.type === "admin"));
      })
      .finally(() => setChargement(false));
  }, []);

  const nomParId = useMemo(() => new Map(administrateurs.map((a) => [a.id, a.nom])), [administrateurs]);

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Journal d&apos;activité</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Historique des actions d&apos;administration : qui a fait quoi, quand, et avec quel résultat.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">Administrateur</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Cible</th>
              <th className="px-4 py-3 font-medium">Résultat</th>
              <th className="px-4 py-3 font-medium">Date / heure</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3 font-medium text-colimo-neutre-fonce">
                  {nomParId.get(a.administrateurId) ?? "—"}
                </td>
                <td className="px-4 py-3">{ACTION_ADMIN_LABELS[a.action]}</td>
                <td className="px-4 py-3 text-colimo-neutre-fonce/70">
                  {a.cibleId ? (nomParId.get(a.cibleId) ?? "—") : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatutBadge
                    statut={a.resultat === "succes" ? "actif" : "echec"}
                    label={a.resultat === "succes" ? "Succès" : "Échec"}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                  {new Date(a.createdAt).toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
            {!chargement && actions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune action enregistrée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
