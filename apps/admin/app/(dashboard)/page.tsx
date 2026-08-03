"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import { getCoursiers, getCourses, getUtilisateurs, type CoursierAvecUtilisateur } from "@/lib/api";
import { formatFCFA, type Course, type Utilisateur } from "@colimo/shared";

const STATUTS_EN_COURS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINES = new Set(["livree", "confirmee"]);

type Periode = "jour" | "7j" | "mois" | "tout";

const PERIODE_LABELS: Record<Periode, string> = {
  jour: "Aujourd'hui",
  "7j": "7 derniers jours",
  mois: "Ce mois-ci",
  tout: "Depuis le début",
};

function estAujourdhui(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

function estCeMois(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function estRecent(dateIso: string, jours: number): boolean {
  const d = new Date(dateIso).getTime();
  return Date.now() - d <= jours * 24 * 60 * 60 * 1000;
}

function estDansPeriode(dateIso: string, periode: Periode): boolean {
  switch (periode) {
    case "jour":
      return estAujourdhui(dateIso);
    case "7j":
      return estRecent(dateIso, 7);
    case "mois":
      return estCeMois(dateIso);
    case "tout":
      return true;
  }
}

export default function DashboardPage() {
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [periode, setPeriode] = useState<Periode>("mois");

  useEffect(() => {
    getCoursiers().then(setCoursiers);
    getCourses().then(setCourses);
    getUtilisateurs().then(setUtilisateurs);
  }, []);

  const commandesJour = courses.filter((c) => estAujourdhui(c.createdAt)).length;
  const commandesEnCours = courses.filter((c) => STATUTS_EN_COURS.has(c.statut)).length;
  const litigesOuverts = courses.filter((c) => c.statut === "litige").length;

  const caJour = courses
    .filter((c) => estAujourdhui(c.createdAt) && c.statut !== "annulee")
    .reduce((total, c) => total + c.prix, 0);

  const coursesPeriode = useMemo(() => courses.filter((c) => estDansPeriode(c.createdAt, periode)), [
    courses,
    periode,
  ]);
  const utilisateursPeriode = useMemo(
    () => utilisateurs.filter((u) => estDansPeriode(u.createdAt, periode)),
    [utilisateurs, periode]
  );

  const commandesTerminees = coursesPeriode.filter((c) => STATUTS_TERMINES.has(c.statut)).length;
  const commandesAnnulees = coursesPeriode.filter((c) => c.statut === "annulee").length;
  const caPeriode = coursesPeriode.filter((c) => c.statut !== "annulee").reduce((total, c) => total + c.prix, 0);
  // La commission n'est comptée que sur les courses confirmées : c'est le
  // seul moment où la livraison — et donc la commission — est effectivement
  // réalisée, quel que soit le mode de paiement (espèces ou mobile money).
  const commissionsPeriode = coursesPeriode
    .filter((c) => c.statut === "confirmee")
    .reduce((total, c) => total + c.commission, 0);

  const coursiersActifs = coursiers.filter((c) => c.disponibilite).length;
  const commercantsActifs = utilisateurs.filter(
    (u) => u.type === "client" && u.typeClient === "commerce" && u.statut !== "suspendu"
  ).length;

  const PERIODES: Periode[] = ["jour", "7j", "mois", "tout"];

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Dashboard</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Vue d&apos;ensemble de l&apos;activité COLIMO</p>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">Aujourd&apos;hui</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Commandes du jour" value={String(commandesJour)} />
        <StatCard label="Chiffre d'affaires du jour" value={formatFCFA(caJour)} />
        <StatCard label="Commandes en cours" value={String(commandesEnCours)} />
        <StatCard label="Litiges ouverts" value={String(litigesOuverts)} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-colimo-neutre-fonce/50">
          Vue d&apos;ensemble
        </h2>
        <select
          value={periode}
          onChange={(e) => setPeriode(e.target.value as Periode)}
          className="rounded-lg border border-colimo-neutre-clair px-3 py-1.5 text-sm focus:border-colimo-rouge focus:outline-none"
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {PERIODE_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={formatFCFA(caPeriode)} sombre />
        <StatCard label="Commissions générées" value={formatFCFA(commissionsPeriode)} />
        <StatCard label="Commandes terminées" value={String(commandesTerminees)} />
        <StatCard label="Commandes annulées" value={String(commandesAnnulees)} />
        <StatCard label="Nouveaux utilisateurs" value={String(utilisateursPeriode.length)} />
        <StatCard label="Coursiers actifs" value={String(coursiersActifs)} />
        <StatCard label="Commerçants actifs" value={String(commercantsActifs)} />
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-colimo-neutre-clair bg-white p-5 text-sm text-colimo-neutre-fonce/60">
        À venir : carte temps réel des coursiers et taux de livraison dans les délais (nécessite de définir un
        délai cible par course).
      </div>
    </div>
  );
}
