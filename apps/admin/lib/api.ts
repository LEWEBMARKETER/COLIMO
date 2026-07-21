import type { Coursier, Course, CourseStatus, Utilisateur, VerificationStatus, Zone } from "@colimo/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CoursierAvecUtilisateur extends Coursier {
  utilisateur: Utilisateur;
}

async function requete<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erreur API ${path} : ${res.status}`);
  return res.json();
}

export function getUtilisateurs(): Promise<Utilisateur[]> {
  return requete("/utilisateurs");
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

export function getCourses(params?: { zone?: Zone; statut?: CourseStatus }): Promise<Course[]> {
  const search = new URLSearchParams();
  if (params?.zone) search.set("zone", params.zone);
  if (params?.statut) search.set("statut", params.statut);
  const query = search.toString();
  return requete(`/courses${query ? `?${query}` : ""}`);
}
