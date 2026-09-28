import type { Course } from "@colimo/shared";

export type Periode = "jour" | "semaine" | "mois" | "tout";

export const PERIODE_LABELS: Record<Periode, string> = {
  jour: "Jour",
  semaine: "Semaine",
  mois: "Mois",
  tout: "Tout",
};

export interface Bucket {
  label: string;
  debut: Date;
  fin: Date;
}

function debutJour(date: Date): Date {
  const r = new Date(date);
  r.setHours(0, 0, 0, 0);
  return r;
}

function ajouterJours(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

// Semaine ISO : le lundi est le premier jour, pas le dimanche.
function debutSemaine(date: Date): Date {
  const r = debutJour(date);
  const jour = r.getDay();
  const decalage = jour === 0 ? 6 : jour - 1;
  return ajouterJours(r, -decalage);
}

function debutMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Découpage temporel pour une période donnée : un bucket par heure (jour),
 * par jour (semaine/mois), ou par mois (tout — du mois le plus ancien
 * présent dans les courses jusqu'au mois en cours). "tout" dépend des
 * courses fournies ; les autres périodes n'en ont pas besoin.
 */
export function genererBuckets(periode: Periode, maintenant: Date, courses: Course[]): Bucket[] {
  if (periode === "jour") {
    const jour = debutJour(maintenant);
    return Array.from({ length: 24 }, (_, h) => ({
      label: `${h}h`,
      debut: new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), h),
      fin: new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), h + 1),
    }));
  }

  if (periode === "semaine") {
    const debut = debutSemaine(maintenant);
    return JOURS_SEMAINE.map((label, i) => ({
      label,
      debut: ajouterJours(debut, i),
      fin: ajouterJours(debut, i + 1),
    }));
  }

  if (periode === "mois") {
    const debut = debutMois(maintenant);
    const nbJours = new Date(debut.getFullYear(), debut.getMonth() + 1, 0).getDate();
    return Array.from({ length: nbJours }, (_, i) => ({
      label: String(i + 1),
      debut: ajouterJours(debut, i),
      fin: ajouterJours(debut, i + 1),
    }));
  }

  if (courses.length === 0) return [];
  const dates = courses.map((c) => new Date(c.createdAt).getTime());
  let curseur = debutMois(new Date(Math.min(...dates)));
  const max = debutMois(maintenant);
  const buckets: Bucket[] = [];
  while (curseur <= max) {
    const suivant = new Date(curseur.getFullYear(), curseur.getMonth() + 1, 1);
    buckets.push({
      label: curseur.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      debut: curseur,
      fin: suivant,
    });
    curseur = suivant;
  }
  return buckets;
}

/**
 * Bornes de la période sélectionnée ("tout" renvoie null : pas de filtrage,
 * comportement historique de l'onglet Courses préservé par défaut).
 */
export function bornesPeriode(periode: Periode, maintenant: Date): { debut: Date; fin: Date } | null {
  if (periode === "tout") return null;
  if (periode === "jour") return { debut: debutJour(maintenant), fin: ajouterJours(debutJour(maintenant), 1) };
  if (periode === "semaine") {
    const debut = debutSemaine(maintenant);
    return { debut, fin: ajouterJours(debut, 7) };
  }
  const debut = debutMois(maintenant);
  return { debut, fin: new Date(debut.getFullYear(), debut.getMonth() + 1, 1) };
}

export interface PointAgrege {
  label: string;
  nombreCourses: number;
  chiffreAffaires: number;
}

// Chiffre d'affaires compté uniquement sur les courses confirmées par le
// client (même convention que statistiques/page.tsx) — le nombre de
// courses, lui, porte sur toute activité de la période, statut confondu.
export function agregerParBucket(courses: Course[], buckets: Bucket[]): PointAgrege[] {
  return buckets.map((bucket) => {
    const sousEnsemble = courses.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= bucket.debut && d < bucket.fin;
    });
    const confirmees = sousEnsemble.filter((c) => c.statut === "confirmee");
    return {
      label: bucket.label,
      nombreCourses: sousEnsemble.length,
      chiffreAffaires: confirmees.reduce((s, c) => s + c.prix, 0),
    };
  });
}
