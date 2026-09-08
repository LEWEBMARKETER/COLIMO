// Compose un jour ("YYYY-MM-DD", issu du sélecteur calendrier) et une heure
// ("HH:mm") en une date ISO complète — remplace l'ancien champ texte libre
// (ex. "2026-08-01 14:30") où l'utilisateur pouvait saisir un format
// invalide. Construit une date locale (pas UTC) : cohérent avec l'ancien
// comportement `new Date(texte)`, qui interprétait déjà la saisie dans le
// fuseau horaire de l'appareil.
export function construireDateProgrammee(jour: string, heure: string): string {
  const [annee, mois, jourNum] = jour.split("-").map(Number) as [number, number, number];
  const [h, m] = heure.split(":").map(Number) as [number, number];
  return new Date(annee, mois - 1, jourNum, h, m, 0, 0).toISOString();
}

export function formaterCleJour(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}
