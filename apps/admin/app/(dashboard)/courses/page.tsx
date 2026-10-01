"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StatutBadge from "@/components/StatutBadge";
import CarteCourses from "@/components/CarteCourses";
import DetailCourseModal from "@/components/DetailCourseModal";
import ValidationLivraisonModal from "@/components/ValidationLivraisonModal";
import GraphiqueBarres from "@/components/GraphiqueBarres";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agregerParBucket, bornesPeriode, genererBuckets, PERIODE_LABELS, type Periode } from "@/lib/periodes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  annulerCourseAdmin,
  getConfirmationsLivraisonAdmin,
  getCourses,
  getUtilisateurs,
  getCoursiers,
  getValidationsAdminLivraison,
  patchCourse,
  type CoursierAvecUtilisateur,
} from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  CATEGORIE_COLIS_LABELS,
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  MOTIF_ANNULATION_ADMIN_LABELS,
  ZONE_LABELS,
  calculerFraisRetour,
  formatFCFA,
  type ConfirmationLivraison,
  type Course,
  type MotifAnnulationAdmin,
  type Utilisateur,
  type ValidationAdminLivraison,
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
  const [confirmations, setConfirmations] = useState<ConfirmationLivraison[]>([]);
  const [filtreZone, setFiltreZone] = useState<string>("toutes");
  const [periode, setPeriode] = useState<Periode>("tout");
  const [filtreAConfirmer, setFiltreAConfirmer] = useState(searchParams.get("filtre") === "a_confirmer");
  const [chargement, setChargement] = useState(true);
  const [panneauAnnulation, setPanneauAnnulation] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<Course | null>(null);
  const [courseAValider, setCourseAValider] = useState<Course | null>(null);
  const [validationsDetail, setValidationsDetail] = useState<ValidationAdminLivraison[]>([]);

  useEffect(() => {
    if (!courseDetail) {
      setValidationsDetail([]);
      return;
    }
    getValidationsAdminLivraison(courseDetail.id).then(setValidationsDetail);
  }, [courseDetail]);
  const [motifAnnulation, setMotifAnnulation] = useState<MotifAnnulationAdmin | "">("");
  const [commentaireAnnulation, setCommentaireAnnulation] = useState("");
  const [annulationEnCours, setAnnulationEnCours] = useState(false);

  useEffect(() => {
    getUtilisateurs().then(setUtilisateurs);
    getCoursiers().then(setCoursiers);
    getConfirmationsLivraisonAdmin().then(setConfirmations);
  }, []);

  const confirmationParCourse = useMemo(
    () => new Map(confirmations.map((c) => [c.courseId, c])),
    [confirmations]
  );

  useEffect(() => {
    setChargement(true);
    getCourses(filtreZone === "toutes" ? undefined : { zone: filtreZone as Zone })
      .then(setCourses)
      .finally(() => setChargement(false));
  }, [filtreZone]);

  // "À confirmer" : déclarées livrées par le coursier, pas encore
  // confirmées — c'est exactement le statut existant "livree" (besoin
  // section 10), pas un nouveau statut.
  const coursesAConfirmer = useMemo(() => courses.filter((c) => c.statut === "livree"), [courses]);

  // Recalculée une seule fois par rendu : "maintenant" ne doit pas dériver
  // entre le filtrage des courses et le découpage du graphique, sinon les
  // deux pourraient retomber sur des bornes de période légèrement différentes.
  const maintenant = useMemo(() => new Date(), []);
  const bornes = useMemo(() => bornesPeriode(periode, maintenant), [periode, maintenant]);

  const coursesAffichees = useMemo(() => {
    let liste = clientIdFiltre ? courses.filter((c) => c.clientId === clientIdFiltre) : courses;
    if (filtreAConfirmer) liste = liste.filter((c) => c.statut === "livree");
    if (bornes) {
      liste = liste.filter((c) => {
        const d = new Date(c.createdAt);
        return d >= bornes.debut && d < bornes.fin;
      });
    }
    return liste;
  }, [courses, clientIdFiltre, filtreAConfirmer, bornes]);

  // Le graphique porte sur les courses déjà filtrées par zone/client/"à
  // confirmer" (coursesAffichees), mais jamais par la période elle-même —
  // les buckets définissent leurs propres bornes temporelles à l'intérieur
  // de la période choisie.
  const buckets = useMemo(() => genererBuckets(periode, maintenant, coursesAffichees), [periode, maintenant, coursesAffichees]);
  const donneesGraphique = useMemo(() => agregerParBucket(coursesAffichees, buckets), [coursesAffichees, buckets]);

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
  );

  const telephoneUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.telephone ?? null,
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
    const misAJour = await patchCourse(course.id, { statut: "retournee", fraisRetour: frais });
    setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
  }

  async function reattribuer(course: Course, coursierId: string) {
    const misAJour = await patchCourse(course.id, { coursierId: coursierId || null });
    setCourses((prev) => prev.map((c) => (c.id === course.id ? misAJour : c)));
  }

  const clientFiltreNom = clientIdFiltre ? nomUtilisateur(clientIdFiltre) : null;

  // Attribution manuelle réservée aux coursiers en ligne — assigner à un
  // coursier hors ligne ne mènerait qu'à une course jamais prise en charge.
  const coursiersEnLigne = useMemo(() => coursiers.filter((c) => c.statut === "en_ligne"), [coursiers]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Courses</h1>
          <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Suivi de toutes les courses de la plateforme</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltreAConfirmer((v) => !v)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              filtreAConfirmer
                ? "border-colimo-rouge bg-colimo-rouge text-white"
                : "border-colimo-neutre-clair text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            }`}
          >
            À confirmer ({coursesAConfirmer.length})
          </button>
          <Select value={periode} onValueChange={(v) => setPeriode(v as Periode)}>
            <SelectTrigger className="h-auto w-auto min-w-[8rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIODE_LABELS) as Periode[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIODE_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtreZone} onValueChange={setFiltreZone}>
            <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les zones</SelectItem>
              {ZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {ZONE_LABELS[zone]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraphiqueBarres
          titre={`Chiffre d'affaires — ${PERIODE_LABELS[periode].toLowerCase()}`}
          donnees={donneesGraphique.map((p) => ({ label: p.label, valeur: p.chiffreAffaires }))}
          formatValeur={formatFCFA}
        />
        <GraphiqueBarres
          titre={`Courses — ${PERIODE_LABELS[periode].toLowerCase()}`}
          donnees={donneesGraphique.map((p) => ({ label: p.label, valeur: p.nombreCourses }))}
          formatValeur={(v) => String(v)}
          couleur="#2B2622"
        />
      </div>

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
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>N° commande</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Coursier</TableHead>
              <TableHead>Trajet</TableHead>
              <TableHead>Colis</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Preuve de livraison</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coursesAffichees.map((course) => (
              <TableRow key={course.id} className="border-colimo-neutre-clair">
                <TableCell className="font-mono text-xs text-colimo-neutre-fonce/70">{course.numeroCommande}</TableCell>
                <TableCell className="text-xs text-colimo-neutre-fonce/70">
                  {new Date(course.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>{nomUtilisateur(course.clientId)}</TableCell>
                <TableCell>{course.coursierId ? nomUtilisateur(course.coursierId) : "—"}</TableCell>
                <TableCell>
                  {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </TableCell>
                <TableCell>{CATEGORIE_COLIS_LABELS[course.categorieColis]}</TableCell>
                <TableCell>
                  {formatFCFA(course.prix)}
                  <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                    Commission : {course.commission !== null ? formatFCFA(course.commission) : "— (à la confirmation)"}
                  </p>
                  {course.fraisRetour !== null && (
                    <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                      Retour : {formatFCFA(course.fraisRetour)}
                    </p>
                  )}
                </TableCell>
                <TableCell>{MODE_PAIEMENT_LABELS[course.modePaiement]}</TableCell>
                <TableCell>
                  <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
                </TableCell>
                <TableCell className="text-xs">
                  {(() => {
                    const confirmation = confirmationParCourse.get(course.id);
                    if (!confirmation) return <span className="text-colimo-neutre-fonce/40">—</span>;
                    return (
                      <div className="flex flex-col gap-0.5 text-colimo-neutre-fonce/70">
                        <span>{confirmation.otpVerifieAt ? "✅ Code vérifié" : "⏳ Code non utilisé"}</span>
                        <span>
                          {confirmation.clientConfirmationStatut === "confirme" && "✅ Client confirmé"}
                          {confirmation.clientConfirmationStatut === "auto_finalise" && "⏱️ Finalisé automatiquement"}
                          {confirmation.clientConfirmationStatut === "signale" && "⚠️ Signalé par le client"}
                          {confirmation.clientConfirmationStatut === "en_attente" && "En attente du client"}
                        </span>
                        {confirmation.preuvePhotoUrl && (
                          <a
                            href={confirmation.preuvePhotoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-colimo-rouge hover:underline"
                          >
                            📷 Voir la photo
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Select
                      value={course.coursierId ?? "aucun"}
                      onValueChange={(v) => reattribuer(course, v === "aucun" ? "" : v)}
                    >
                      <SelectTrigger className="h-auto rounded-md border-colimo-neutre-clair px-2 py-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aucun">Sans coursier</SelectItem>
                        {/* Attribution manuelle réservée aux coursiers en ligne ;
                            le coursier déjà assigné reste visible même hors ligne,
                            pour ne pas fausser l'état affiché du select. */}
                        {(course.coursierId && !coursiersEnLigne.some((c) => c.utilisateurId === course.coursierId)
                          ? [...coursiers.filter((c) => c.utilisateurId === course.coursierId), ...coursiersEnLigne]
                          : coursiersEnLigne
                        ).map((c) => (
                          <SelectItem key={c.utilisateurId} value={c.utilisateurId}>
                            {c.utilisateur.prenom ? `${c.utilisateur.prenom} ` : ""}
                            {c.utilisateur.nom}
                            {c.statut !== "en_ligne" ? " (hors ligne)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={() => setCourseDetail(course)}
                      className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                    >
                      Détails
                    </button>
                    {course.statut === "livree" && (
                      <>
                        <button
                          onClick={() => setCourseAValider(course)}
                          className="rounded-md bg-colimo-rouge px-2 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                        >
                          Confirmer la livraison
                        </button>
                        {telephoneUtilisateur(course.clientId) && (
                          <a
                            href={`tel:${telephoneUtilisateur(course.clientId)}`}
                            className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-center text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                          >
                            📞 Appeler le client
                          </a>
                        )}
                        {course.coursierId && telephoneUtilisateur(course.coursierId) && (
                          <a
                            href={`tel:${telephoneUtilisateur(course.coursierId)}`}
                            className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-center text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                          >
                            📞 Appeler le coursier
                          </a>
                        )}
                      </>
                    )}
                    {course.statut !== "annulee" && (
                      <button
                        onClick={() => ouvrirPanneauAnnulation(course)}
                        className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        Annuler la course
                      </button>
                    )}
                    {STATUTS_RETOURNABLES.has(course.statut) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair">
                            Colis retourné
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Marquer ce colis comme retourné ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le client de {course.numeroCommande} sera facturé{" "}
                              {formatFCFA(calculerFraisRetour(course.prix))} (50% du prix), conformément à la
                              politique de retour.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => marquerRetournee(course)}>Confirmer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {panneauAnnulation === course.id && (
                      <div className="mt-1 w-56 rounded-md border border-colimo-neutre-clair bg-colimo-fond p-2">
                        <Select
                          value={motifAnnulation || undefined}
                          onValueChange={(v) => setMotifAnnulation(v as MotifAnnulationAdmin)}
                        >
                          <SelectTrigger className="mb-2 h-auto w-full rounded-md border-colimo-neutre-clair px-2 py-1 text-xs">
                            <SelectValue placeholder="Motif de l'annulation…" />
                          </SelectTrigger>
                          <SelectContent>
                            {MOTIFS_ADMIN.map((m) => (
                              <SelectItem key={m.valeur} value={m.valeur}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                </TableCell>
              </TableRow>
            ))}
            {!chargement && coursesAffichees.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucune course pour ce filtre
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {courseDetail && (
        <DetailCourseModal
          course={courseDetail}
          client={utilisateurs.find((u) => u.id === courseDetail.clientId)}
          coursier={courseDetail.coursierId ? utilisateurs.find((u) => u.id === courseDetail.coursierId) : undefined}
          confirmation={confirmationParCourse.get(courseDetail.id)}
          validationsAdmin={validationsDetail}
          nomUtilisateur={nomUtilisateur}
          onClose={() => setCourseDetail(null)}
        />
      )}

      {courseAValider && (
        <ValidationLivraisonModal
          course={courseAValider}
          onClose={() => setCourseAValider(null)}
          onValide={(misAJour) => {
            setCourses((prev) => prev.map((c) => (c.id === misAJour.id ? misAJour : c)));
            setCourseAValider(null);
          }}
        />
      )}
    </div>
  );
}
