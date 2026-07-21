"use client";

import { useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { coursiers as coursiersInitial } from "@/lib/mockData";
import type { VerificationStatus } from "@colimo/shared";

const LABELS_VERIFICATION: Record<VerificationStatus, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

export default function CoursiersPage() {
  const [coursiers, setCoursiers] = useState(coursiersInitial);

  // TODO: persister la décision via Supabase (update coursiers.statut_verification).
  function changerStatut(id: string, statut: VerificationStatus) {
    setCoursiers((prev) => prev.map((c) => (c.id === id ? { ...c, statutVerification: statut } : c)));
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Coursiers</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Validation des inscriptions et suivi des coursiers
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Véhicule</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coursiers.map((coursier) => (
              <tr key={coursier.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3">{coursier.utilisateur.nom}</td>
                <td className="px-4 py-3">{coursier.utilisateur.telephone}</td>
                <td className="px-4 py-3 capitalize">{coursier.utilisateur.zone}</td>
                <td className="px-4 py-3 capitalize">{coursier.typeVehicule}</td>
                <td className="px-4 py-3">{coursier.noteMoyenne || "—"}</td>
                <td className="px-4 py-3">
                  <StatutBadge
                    statut={coursier.statutVerification}
                    label={LABELS_VERIFICATION[coursier.statutVerification]}
                  />
                </td>
                <td className="px-4 py-3">
                  {coursier.statutVerification === "en_attente" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => changerStatut(coursier.id, "valide")}
                        className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => changerStatut(coursier.id, "rejete")}
                        className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <span className="text-colimo-neutre-fonce/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
