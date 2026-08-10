"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StatutBadge from "@/components/StatutBadge";
import CarteCourses from "@/components/CarteCourses";
import { annulerCourseAdmin, getCourses, getUtilisateurs, getCoursiers, patchCourse, type CoursierAvecUtilisateur } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  CATEGORIE_COLIS_LABELS,
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  MOTIF_ANNULATION_ADMIN_LABELS,
  ZONE_LABELS,
  calculerFraisRetour,
  formatFCFA,
  type Course,
  type MotifAnnulationAdmin,
  type Utilisateur,
  type Zone,
} from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];
const STATUTS_RETOURNABLES = new Set(["retrait", "en_cours", "livree"]);
const STATUTS_ACTIFS = new Set(["en_attente", "acceptee", "retrait", "en_cours"]);

const MOTIFS_ADMIN: { valeur: MotifAnnulationAdmin; label: string }[] = (
  Object.keys(MOTIF_ANNULATION_ADMIN_LABELS) as MotifAnnulationAdmin[]
).map((valeur) => ({ valeur, label: MOTIF_ANNULATION_ADMIN_LABELS[valeur] }));

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
  const [panneauAnnulation, setPanneauAnnulation] = useState<string | null>(null);
  const [motifAnnulation, setMotifAnnulation] = useState<MotifAnnulationAdmin | "">("");
  const [commentaireAnnulation, setCommentaireAnnulation] = useState("");
  const [annulationEnCours, setAnnulationEnCours] = useState(false);

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

  const coursesActives = useMemo(
    () => coursesAffichees.filter((c) => STATUTS_ACTIFS.has(c.statut)),
    [coursesAffichees]
  );

  function ouvrirPanneauAnnulation(course: Course) {
    setPanneauAnnulation(course.id);
    setMotifAnnulation("");
    setCommentaireAnnulation("");
  }

  function fermerPanneauAnnulation() {
    setPanneauAnnulation(null);
    setMotifAnnulation("");
    setCommentaireAnnulation("");
  }

  async function confirmerAnnulation(course: Course) {
    if (!motifAnnulation) return;
    if (motifAnnulation === "autre" && !commentaireAnnulation.trim()) return;

    const motif =
      motifAnnulation === "autre" ? commentaireAnnulation.trim() : MOTIF_ANNULATION_ADMIN_LABELS[motifAnnulation];

    setAnnulationEnCours(true);
    try {
      const misAJour = await annulerCourseAdmin({
        courseId: course.id,
        motif,
        commentaire: commentaireAnnulation.trim() || undefined,
      });
      setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
      await notifierEvenement("livraison_annulee", {
        destinataire: misAJour.telephoneDestinataire,
        variables: { nom_client: misAJour.nomDestinataire ?? "client", numero_commande: misAJour.numeroCommande },
      });
      await notifierEvenement("notification_livraison_annulee", {
        destinataire: misAJour.clientId,
        utilisateurId: misAJour.clientId,
        variables: { numero_commande: misAJour.numeroCommande },
      });
      if (misAJour.coursierId) {
        await notifierEvenement("notification_livraison_annulee_coursier", {
          destinataire: misAJour.coursierId,
          utilisateurId: misAJour.coursierId,
          variables: { numero_commande: misAJour.numeroCommande },
        });
      }
      fermerPanneauAnnulation();
    } finally {
      setAnnulationEnCours(false);
    }
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

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Courses actives sur la carte</h2>
          <span className="text-xs text-colimo-neutre-fonce/50">
            {coursesActives.length} course{coursesActives.length > 1 ? "s" : ""} en cours
          </span>
        </div>
        <CarteCourses courses={coursesActives} nomUtilisateur={nomUtilisateur} />
      </div>

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
                    {course.statut !== "annulee" && (
                      <button
                        onClick={() => ouvrirPanneauAnnulation(course)}
                        className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        Annuler la course
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
                    {panneauAnnulation === course.id && (
                      <div className="mt-1 w-56 rounded-md border border-colimo-neutre-clair bg-colimo-fond p-2">
                        <select
                          value={motifAnnulation}
                          onChange={(e) => setMotifAnnulation(e.target.value as MotifAnnulationAdmin)}
                          className="mb-2 w-full rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                        >
                          <option value="">Motif de l'annulation…</option>
                          {MOTIFS_ADMIN.map((m) => (
                            <option key={m.valeur} value={m.valeur}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={commentaireAnnulation}
                          onChange={(e) => setCommentaireAnnulation(e.target.value)}
                          placeholder={
                            motifAnnulation === "autre" ? "Précisez le motif (obligatoire)…" : "Commentaire (facultatif)…"
                          }
                          className="mb-2 w-full rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                          rows={2}
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => confirmerAnnulation(course)}
                            disabled={
                              annulationEnCours || !motifAnnulation || (motifAnnulation === "autre" && !commentaireAnnulation.trim())
                            }
                            className="rounded-md bg-colimo-rouge px-2 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={fermerPanneauAnnulation}
                            disabled={annulationEnCours}
                            className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-white disabled:opacity-60"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
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
