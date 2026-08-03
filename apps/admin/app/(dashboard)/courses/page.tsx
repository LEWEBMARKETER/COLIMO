"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StatutBadge from "@/components/StatutBadge";
import { getCourses, getUtilisateurs, getCoursiers, patchCourse, type CoursierAvecUtilisateur } from "@/lib/api";
import { notifierEvenement } from "@/lib/notifications";
import {
  CATEGORIE_COLIS_LABELS,
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  ZONE_LABELS,
  calculerFraisRetour,
  formatFCFA,
  type Course,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];
const STATUTS_ANNULABLES = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);
const STATUTS_RETOURNABLES = new Set(["retrait", "en_cours", "livree"]);

export default function CoursesPage() {
  return (
    <Suspense fallback={null}>
      <CoursesContenu />
    </Suspense>
  );
}

function CoursesContenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFiltre = searchParams.get("clientId");

  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [coursiers, setCoursiers] = useState<CoursierAvecUtilisateur[]>([]);
  const [filtreZone, setFiltreZone] = useState<string>("toutes");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    getUtilisateurs().then(setUtilisateurs);
    getCoursiers().then(setCoursiers);
  }, []);

  useEffect(() => {
    setChargement(true);
    getCourses(filtreZone === "toutes" ? undefined : { zone: filtreZone as Zone })
      .then(setCourses)
      .finally(() => setChargement(false));
  }, [filtreZone]);

  const coursesAffichees = useMemo(
    () => (clientIdFiltre ? courses.filter((c) => c.clientId === clientIdFiltre) : courses),
    [courses, clientIdFiltre]
  );

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
  );

  async function annuler(course: Course) {
    if (!window.confirm(`Annuler la course ${course.numeroCommande} ?`)) return;
    const misAJour = await patchCourse(course.id, { statut: "annulee" });
    setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
    await notifierEvenement("livraison_annulee", {
      destinataire: misAJour.telephoneDestinataire,
      variables: { nom_client: misAJour.nomDestinataire ?? "client", numero_commande: misAJour.numeroCommande },
    });
  }

  async function marquerRetournee(course: Course) {
    const frais = calculerFraisRetour(course.prix);
    if (
      !window.confirm(
        `Marquer le colis de ${course.numeroCommande} comme retourné ? Le client sera facturé ${formatFCFA(
          frais
        )} (50% du prix), conformément à la politique de retour.`
      )
    )
      return;
    const misAJour = await patchCourse(course.id, { statut: "retournee", fraisRetour: frais });
    setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
  }

  async function reattribuer(course: Course, coursierId: string) {
    const misAJour = await patchCourse(course.id, { coursierId: coursierId || null });
    setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
  }

  const clientFiltreNom = clientIdFiltre ? nomUtilisateur(clientIdFiltre) : null;

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

      {clientFiltreNom && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-colimo-neutre-fonce/70">
            Filtré pour le client : <strong>{clientFiltreNom}</strong>
          </span>
          <button onClick={() => router.push("/courses")} className="text-colimo-rouge hover:underline">
            Retirer le filtre
          </button>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">N° commande</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Coursier</th>
              <th className="px-4 py-3 font-medium">Trajet</th>
              <th className="px-4 py-3 font-medium">Colis</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Paiement</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coursesAffichees.map((course) => (
              <tr key={course.id} className="border-b border-colimo-neutre-clair last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-colimo-neutre-fonce/70">{course.numeroCommande}</td>
                <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                  {new Date(course.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">{nomUtilisateur(course.clientId)}</td>
                <td className="px-4 py-3">{course.coursierId ? nomUtilisateur(course.coursierId) : "—"}</td>
                <td className="px-4 py-3">
                  {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </td>
                <td className="px-4 py-3">{CATEGORIE_COLIS_LABELS[course.categorieColis]}</td>
                <td className="px-4 py-3">
                  {formatFCFA(course.prix)}
                  <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                    Commission : {formatFCFA(course.commission)}
                  </p>
                  {course.fraisRetour !== null && (
                    <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                      Retour : {formatFCFA(course.fraisRetour)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">{MODE_PAIEMENT_LABELS[course.modePaiement]}</td>
                <td className="px-4 py-3">
                  <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={course.coursierId ?? ""}
                      onChange={(e) => reattribuer(course, e.target.value)}
                      className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                    >
                      <option value="">Sans coursier</option>
                      {coursiers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.utilisateur.prenom ? `${c.utilisateur.prenom} ` : ""}
                          {c.utilisateur.nom}
                        </option>
                      ))}
                    </select>
                    {STATUTS_ANNULABLES.has(course.statut) && (
                      <button
                        onClick={() => annuler(course)}
                        className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        Annuler
                      </button>
                    )}
                    {STATUTS_RETOURNABLES.has(course.statut) && (
                      <button
                        onClick={() => marquerRetournee(course)}
                        className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        Colis retourné
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!chargement && coursesAffichees.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune course pour ce filtre
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
