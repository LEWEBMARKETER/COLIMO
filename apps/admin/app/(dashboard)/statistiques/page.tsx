"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/StatCard";
import { getCourses, getUtilisateurs } from "@/lib/api";
import {
  formatFCFA,
  MODE_PAIEMENT_LABELS,
  ZONE_LABELS,
  type Course,
  type ModePaiement,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];
const MODES_PAIEMENT = Object.keys(MODE_PAIEMENT_LABELS) as ModePaiement[];

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

  // Chiffre d'affaires et commissions ne portent que sur les courses
  // effectivement confirmées par le client (livraison réellement payée),
  // quel que soit le mode de paiement retenu (espèces ou mobile money).
  const coursesConfirmees = courses.filter((c) => c.statut === "confirmee");
  const chiffreAffairesTotal = coursesConfirmees.reduce((s, c) => s + c.prix, 0);
  const commissionsGenerees = coursesConfirmees.reduce((s, c) => s + c.commission, 0);
  const gainsCoursiersNets = chiffreAffairesTotal - commissionsGenerees;

  const parModePaiement = MODES_PAIEMENT.map((mode) => {
    const sousEnsemble = coursesConfirmees.filter((c) => c.modePaiement === mode);
    return {
      mode,
      ca: sousEnsemble.reduce((s, c) => s + c.prix, 0),
      commission: sousEnsemble.reduce((s, c) => s + c.commission, 0),
    };
  });

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

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">
        Revenus (courses confirmées)
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Chiffre d'affaires total" value={formatFCFA(chiffreAffairesTotal)} />
        <StatCard label="Commissions générées" value={formatFCFA(commissionsGenerees)} />
        <StatCard label="Gains coursiers (net)" value={formatFCFA(gainsCoursiersNets)} />
      </div>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Par mode de paiement</h2>
        <ul className="mt-4 space-y-3">
          {parModePaiement.map(({ mode, ca, commission }) => (
            <li key={mode} className="flex items-center justify-between text-sm">
              <span>{MODE_PAIEMENT_LABELS[mode]}</span>
              <span>
                <span className="font-medium">{formatFCFA(ca)}</span>
                <span className="ml-2 text-xs text-colimo-neutre-fonce/50">
                  dont {formatFCFA(commission)} de commission
                </span>
              </span>
            </li>
          ))}
        </ul>
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
