"use client";

import { useEffect, useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { getCourses, getUtilisateurs } from "@/lib/api";
import {
  CATEGORIE_COLIS_LABELS,
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  ZONE_LABELS,
  formatFCFA,
  type Course,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [filtreZone, setFiltreZone] = useState<string>("toutes");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    getUtilisateurs().then(setUtilisateurs);
  }, []);

  useEffect(() => {
    setChargement(true);
    getCourses(filtreZone === "toutes" ? undefined : { zone: filtreZone as Zone })
      .then(setCourses)
      .finally(() => setChargement(false));
  }, [filtreZone]);

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Courses</h1>
          <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Suivi de toutes les courses de la plateforme</p>
        </div>

        <select
          value={filtreZone}
          onChange={(e) => setFiltreZone(e.target.value)}
          className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
        >
          <option value="toutes">Toutes les zones</option>
          {ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {ZONE_LABELS[zone]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">N° commande</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Coursier</th>
              <th className="px-4 py-3 font-medium">Trajet</th>
              <th className="px-4 py-3 font-medium">Colis</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Paiement</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">{course.numeroCommande}</td>
                <td className="px-4 py-3">{nomUtilisateur(course.clientId)}</td>
                <td className="px-4 py-3">{course.coursierId ? nomUtilisateur(course.coursierId) : "—"}</td>
                <td className="px-4 py-3">
                  {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </td>
                <td className="px-4 py-3">{CATEGORIE_COLIS_LABELS[course.categorieColis]}</td>
                <td className="px-4 py-3">{formatFCFA(course.prix)}</td>
                <td className="px-4 py-3">{MODE_PAIEMENT_LABELS[course.modePaiement]}</td>
                <td className="px-4 py-3">
                  <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
                </td>
              </tr>
            ))}
            {!chargement && courses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune course pour cette zone
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
