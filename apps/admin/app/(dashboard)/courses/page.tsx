"use client";

import { useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { courses, utilisateurs, zones } from "@/lib/mockData";
import { COURSE_STATUS_LABELS, formatFCFA, ZONE_LABELS } from "@colimo/shared";

function nomUtilisateur(id: string): string {
  return utilisateurs.find((u) => u.id === id)?.nom ?? "—";
}

export default function CoursesPage() {
  const [filtreZone, setFiltreZone] = useState<string>("toutes");

  const coursesFiltrees = useMemo(() => {
    if (filtreZone === "toutes") return courses;
    return courses.filter((c) => c.zoneDepart === filtreZone);
  }, [filtreZone]);

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
          {zones.map((zone) => (
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
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Coursier</th>
              <th className="px-4 py-3 font-medium">Trajet</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {coursesFiltrees.map((course) => (
              <tr key={course.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3">{nomUtilisateur(course.clientId)}</td>
                <td className="px-4 py-3">{course.coursierId ? nomUtilisateur(course.coursierId) : "—"}</td>
                <td className="px-4 py-3">
                  {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </td>
                <td className="px-4 py-3">{formatFCFA(course.prix)}</td>
                <td className="px-4 py-3">
                  <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
                </td>
              </tr>
            ))}
            {coursesFiltrees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
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
