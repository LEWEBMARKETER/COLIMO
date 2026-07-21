import type { Coursier, Course, CourseStatus, Notation, Utilisateur, VerificationStatus, Zone } from "@colimo/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CoursierAvecUtilisateur extends Coursier {
  utilisateur: Utilisateur;
}

async function requete<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`Erreur API ${path} : ${res.status}`);
  return res.json();
}

export function getCoursiers(): Promise<CoursierAvecUtilisateur[]> {
  return requete("/coursiers");
}

export function patchCoursier(
  id: string,
  body: { statutVerification?: VerificationStatus; disponibilite?: boolean }
): Promise<Coursier> {
  return requete(`/coursiers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function inscrireCoursier(body: {
  nom: string;
  telephone: string;
  zone: Zone;
  typeVehicule: Coursier["typeVehicule"];
  documents: string[];
}): Promise<{ utilisateur: Utilisateur; coursier: Coursier }> {
  return requete("/coursiers/inscription", { method: "POST", body: JSON.stringify(body) });
}

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  const search = new URLSearchParams();
  if (params?.zone) search.set("zone", params.zone);
  if (params?.statut) search.set("statut", params.statut);
  const query = search.toString();
  return requete(`/courses${query ? `?${query}` : ""}`);
}

export function getCourse(id: string): Promise<Course> {
  return requete(`/courses/${id}`);
}

export function creerCourse(body: {
  clientId: string;
  adresseDepart: string;
  adresseArrivee: string;
  zoneDepart: Zone;
  zoneArrivee: Zone;
  typeColis: string;
  livraisonPrioritaire?: boolean;
  valeurDeclaree?: number;
  prix: number;
}): Promise<Course> {
  return requete("/courses", { method: "POST", body: JSON.stringify(body) });
}

export function patchCourse(id: string, body: { statut?: CourseStatus; coursierId?: string | null }): Promise<Course> {
  return requete(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function creerNotation(body: {
  courseId: string;
  auteurId: string;
  destinataireId: string;
  note: number;
  commentaire?: string;
}): Promise<Notation> {
  return requete("/notations", { method: "POST", body: JSON.stringify(body) });
}

export function getNotations(courseId: string): Promise<Notation[]> {
  return requete(`/notations?courseId=${courseId}`);
}
