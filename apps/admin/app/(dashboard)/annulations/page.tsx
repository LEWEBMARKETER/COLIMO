"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommercantsBruts, getCourses, getHistoriqueAnnulations, getUtilisateurs } from "@/lib/api";
import {
  calculerPlanEffectif,
  COURSE_STATUS_LABELS,
  ROLE_ANNULATION_LABELS,
  type Commercant,
  type Course,
  type HistoriqueAnnulation,
  type RoleAnnulation,
  type Utilisateur,
} from "@colimo/shared";

const ROLES_FILTRE: RoleAnnulation[] = ["client_particulier", "client_commerce", "admin"];

export default function AnnulationsPage() {
  const [historique, setHistorique] = useState<HistoriqueAnnulation[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [chargement, setChargement] = useState(true);

  const [filtreRole, setFiltreRole] = useState<RoleAnnulation | "tous">("tous");
  const [filtreUtilisateur, setFiltreUtilisateur] = useState<string>("tous");

  useEffect(() => {
    Promise.all([getHistoriqueAnnulations(), getCourses({ statut: "annulee" }), getUtilisateurs(), getCommercantsBruts()])
      .then(([h, c, u, commercantsBruts]) => {
        setHistorique(h);
        setCourses(c);
        setUtilisateurs(u);
        setCommercants(commercantsBruts);
      })
      .finally(() => setChargement(false));
  }, []);

  function estClientBusiness(utilisateurId: string): boolean {
    const commerce = commercants.find((c) => c.utilisateurId === utilisateurId);
    return commerce ? calculerPlanEffectif(commerce) === "business" : false;
  }

  const numeroCommande = useMemo(
    () => (courseId: string) => courses.find((c) => c.id === courseId)?.numeroCommande ?? courseId,
    [courses]
  );

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
  );

  const historiqueFiltre = useMemo(
    () =>
      historique.filter(
        (h) =>
          (filtreRole === "tous" || h.role === filtreRole) &&
          (filtreUtilisateur === "tous" || h.utilisateurId === filtreUtilisateur)
      ),
    [historique, filtreRole, filtreUtilisateur]
  );

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Annulations</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Historique de toutes les annulations de courses</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value as RoleAnnulation | "tous")}
          className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
        >
          <option value="tous">Tous les rôles</option>
          {ROLES_FILTRE.map((role) => (
            <option key={role} value={role}>
              {ROLE_ANNULATION_LABELS[role]}
            </option>
          ))}
        </select>

        <select
          value={filtreUtilisateur}
          onChange={(e) => setFiltreUtilisateur(e.target.value)}
          className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
        >
          <option value="tous">Tous les utilisateurs</option>
          {utilisateurs.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">N° commande</th>
              <th className="px-4 py-3 font-medium">Utilisateur</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Motif</th>
              <th className="px-4 py-3 font-medium">Commentaire</th>
              <th className="px-4 py-3 font-medium">Statut précédent → nouveau</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {historiqueFiltre.map((h) => (
              <tr key={h.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">{numeroCommande(h.courseId)}</td>
                <td className="px-4 py-3">
                  {nomUtilisateur(h.utilisateurId)}
                  {h.role === "client_commerce" && estClientBusiness(h.utilisateurId) && (
                    <span className="ml-1.5 rounded-full bg-colimo-rouge-clair px-2 py-0.5 text-xs font-medium text-colimo-rouge">
                      Business
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{ROLE_ANNULATION_LABELS[h.role]}</td>
                <td className="px-4 py-3">{h.motif}</td>
                <td className="px-4 py-3 text-colimo-neutre-fonce/70">{h.commentaire ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                  {COURSE_STATUS_LABELS[h.statutPrecedent]} → {COURSE_STATUS_LABELS[h.nouveauStatut]}
                </td>
                <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                  {new Date(h.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
            {!chargement && historiqueFiltre.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune annulation pour ce filtre
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
