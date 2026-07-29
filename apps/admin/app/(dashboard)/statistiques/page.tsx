"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import { getCourses, getUtilisateurs } from "@/lib/api";
import { formatFCFA, ZONE_LABELS, type Course, type Utilisateur, type Zone } from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];

export default function StatistiquesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);

  useEffect(() => {
    getCourses().then(setCourses);
    getUtilisateurs().then(setUtilisateurs);
  }, []);

  const totalCourses = courses.length;
  const prixMoyen = totalCourses ? Math.round(courses.reduce((s, c) => s + c.prix, 0) / totalCourses) : 0;

  const parZone = ZONES.map((zone) => ({ zone, count: courses.filter((c) => c.zoneDepart === zone).length })).filter(
    (z) => z.count > 0
  );

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Statistiques</h1>
          <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Vue agrégée des courses de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => import("@/lib/export").then((m) => m.exporterCoursesExcel(courses, utilisateurs))}
            disabled={courses.length === 0}
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
          >
            Exporter Excel
          </button>
          <button
            onClick={() => import("@/lib/export").then((m) => m.exporterCoursesPdf(courses, utilisateurs))}
            disabled={courses.length === 0}
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
          >
            Exporter PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Courses totales" value={String(totalCourses)} />
        <StatCard label="Prix moyen" value={formatFCFA(prixMoyen)} />
        <StatCard label="Zones actives" value={String(parZone.length)} />
      </div>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Répartition par zone de départ</h2>
        <ul className="mt-4 space-y-2">
          {parZone.map(({ zone, count }) => (
            <li key={zone} className="flex items-center justify-between text-sm">
              <span>{ZONE_LABELS[zone]}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
