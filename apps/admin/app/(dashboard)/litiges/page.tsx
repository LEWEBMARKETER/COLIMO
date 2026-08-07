"use client";

import { useEffect, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { getCommercantsBruts, getCourses, getLitiges, getUtilisateurs, resoudreLitige } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  calculerFraisRetour,
  calculerPlanEffectif,
  COURSE_STATUS_LABELS,
  estUrlHttpSure,
  formatFCFA,
  LITIGE_MOTIF_LABELS,
  MOTIF_ANNULATION_ADMIN_LABELS,
  RESOLUTION_LITIGE_LABELS,
  ZONE_LABELS,
  type Commercant,
  type Course,
  type Litige,
  type MotifAnnulationAdmin,
  type ResolutionLitige,
  type Utilisateur,
} from "@colimo/shared";

// Résolutions qui n'ont besoin d'aucune saisie complémentaire — un simple
// window.confirm suffit, comme le reste des actions rapides de l'admin.
const RESOLUTIONS_SIMPLES = new Set<ResolutionLitige>(["maintenue", "retour"]);

const MOTIFS_ADMIN: { valeur: MotifAnnulationAdmin; label: string }[] = (
  Object.keys(MOTIF_ANNULATION_ADMIN_LABELS) as MotifAnnulationAdmin[]
).map((valeur) => ({ valeur, label: MOTIF_ANNULATION_ADMIN_LABELS[valeur] }));

interface PanneauResolution {
  courseId: string;
  resolution: ResolutionLitige;
}

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Course[]>([]);
  const [rapports, setRapports] = useState<Litige[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);

  const [panneau, setPanneau] = useState<PanneauResolution | null>(null);
  const [motifPanneau, setMotifPanneau] = useState<MotifAnnulationAdmin | "">("");
  const [commentairePanneau, setCommentairePanneau] = useState("");
  const [montantPanneau, setMontantPanneau] = useState("");

  useEffect(() => {
    charger();
  }, []);

  function charger() {
    setChargement(true);
    return Promise.all([getCourses({ statut: "litige" }), getLitiges(), getUtilisateurs(), getCommercantsBruts()])
      .then(([courses, litigesDetails, users, commercantsBruts]) => {
        setLitiges(courses);
        setRapports(litigesDetails);
        setUtilisateurs(users);
        setCommercants(commercantsBruts);
      })
      .finally(() => setChargement(false));
  }

  function nomUtilisateur(id: string): string {
    return utilisateurs.find((u) => u.id === id)?.nom ?? "—";
  }

  function estClientBusiness(utilisateurId: string): boolean {
    const commerce = commercants.find((c) => c.utilisateurId === utilisateurId);
    return commerce ? calculerPlanEffectif(commerce) === "business" : false;
  }

  function rapportPourCourse(courseId: string): Litige | undefined {
    // Le plus récent signalement pour cette course (getLitiges trie déjà par date décroissante).
    return rapports.find((r) => r.courseId === courseId);
  }

  function fermerPanneau() {
    setPanneau(null);
    setMotifPanneau("");
    setCommentairePanneau("");
    setMontantPanneau("");
  }

  async function appliquerResolution(
    course: Course,
    resolution: ResolutionLitige,
    params?: { motif?: string; commentaire?: string; montant?: number }
  ) {
    setEnCours(course.id);
    try {
      const misAJour = await resoudreLitige({
        courseId: course.id,
        resolution,
        motif: params?.motif,
        commentaire: params?.commentaire,
        montant: params?.montant,
      });
      const resolutionLabel =
        resolution === "remboursement_partiel" && params?.montant
          ? `${RESOLUTION_LITIGE_LABELS[resolution]} (${formatFCFA(params.montant)})`
          : RESOLUTION_LITIGE_LABELS[resolution];
      await notifierEvenement("litige_resolu", {
        destinataire: misAJour.telephoneDestinataire,
        variables: { nom_client: misAJour.nomDestinataire ?? "client", numero_commande: misAJour.numeroCommande, resolution: resolutionLabel },
      });
      await notifierEvenement("notification_litige_resolu", {
        destinataire: misAJour.clientId,
        utilisateurId: misAJour.clientId,
        variables: { numero_commande: misAJour.numeroCommande, resolution: resolutionLabel },
      });
      if (misAJour.coursierId) {
        await notifierEvenement("notification_litige_resolu", {
          destinataire: misAJour.coursierId,
          utilisateurId: misAJour.coursierId,
          variables: { numero_commande: misAJour.numeroCommande, resolution: resolutionLabel },
        });
      }
      setLitiges((prev) => prev.filter((c) => c.id !== course.id));
      fermerPanneau();
    } finally {
      setEnCours(null);
    }
  }

  function declencherResolution(course: Course, resolution: ResolutionLitige) {
    if (RESOLUTIONS_SIMPLES.has(resolution)) {
      const confirmations: Record<"maintenue" | "retour", string> = {
        maintenue: `Maintenir la course ${course.numeroCommande} (la livraison reprend son cours) ?`,
        retour: `Marquer le colis de ${course.numeroCommande} comme retourné ? Le client sera facturé ${formatFCFA(
          calculerFraisRetour(course.prix)
        )} (50% du prix), conformément à la politique de retour.`,
      };
      if (!window.confirm(confirmations[resolution as "maintenue" | "retour"])) return;
      appliquerResolution(course, resolution);
      return;
    }
    setPanneau({ courseId: course.id, resolution });
  }

  function confirmerPanneau(course: Course) {
    if (!panneau) return;
    if (panneau.resolution === "annulee" && !motifPanneau) return;
    if (panneau.resolution === "remboursement_partiel" && (!montantPanneau || Number(montantPanneau) <= 0)) return;
    if (panneau.resolution === "rejetee" && !commentairePanneau.trim()) return;

    const motif =
      panneau.resolution === "annulee"
        ? motifPanneau === "autre"
          ? commentairePanneau.trim() || "Autre"
          : MOTIF_ANNULATION_ADMIN_LABELS[motifPanneau as MotifAnnulationAdmin]
        : undefined;

    appliquerResolution(course, panneau.resolution, {
      motif,
      commentaire: commentairePanneau.trim() || undefined,
      montant: panneau.resolution === "remboursement_partiel" ? Number(montantPanneau) : undefined,
    });
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Litiges</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Courses signalées nécessitant une intervention</p>

      <div className="mt-6 space-y-3">
        {litiges.map((course) => {
          const rapport = rapportPourCourse(course.id);
          const panneauCourse = panneau?.courseId === course.id ? panneau : null;
          return (
          <div key={course.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-colimo-neutre-fonce">
                  {course.numeroCommande} · {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </p>
                <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
                  Client : {nomUtilisateur(course.clientId)}
                  {estClientBusiness(course.clientId) && (
                    <span className="ml-1.5 rounded-full bg-colimo-rouge-clair px-2 py-0.5 text-xs font-medium text-colimo-rouge">
                      Business
                    </span>
                  )}{" "}
                  · Coursier : {course.coursierId ? nomUtilisateur(course.coursierId) : "—"}
                </p>
                <p className="mt-1 text-sm text-colimo-neutre-fonce/70">{formatFCFA(course.prix)}</p>
                {course.instructions && (
                  <p className="mt-1 text-xs italic text-colimo-neutre-fonce/50">
                    Instructions : {course.instructions}
                  </p>
                )}
              </div>
              <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
            </div>

            {rapport ? (
              <div className="mt-4 rounded-xl bg-colimo-fond p-4">
                <p className="text-sm">
                  <span className="font-medium text-colimo-neutre-fonce">Motif : </span>
                  <span className="text-colimo-neutre-fonce/80">{LITIGE_MOTIF_LABELS[rapport.motif]}</span>
                  <span className="ml-2 text-xs text-colimo-neutre-fonce/50">
                    (signalé par {nomUtilisateur(rapport.auteurId)})
                  </span>
                </p>
                {rapport.commentaire && (
                  <p className="mt-2 text-sm text-colimo-neutre-fonce/80">« {rapport.commentaire} »</p>
                )}
                {rapport.preuveUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rapport.preuveUrls.filter(estUrlHttpSure).map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-colimo-neutre-clair bg-white px-2.5 py-1 text-xs text-colimo-rouge hover:underline"
                      >
                        Preuve {index + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-colimo-neutre-fonce/50">
                Aucun détail de signalement disponible pour ce litige.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-colimo-neutre-clair pt-4">
              <button
                onClick={() => declencherResolution(course, "maintenue")}
                disabled={enCours === course.id}
                className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
              >
                Maintenir la course
              </button>
              <button
                onClick={() => declencherResolution(course, "retour")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Retour du colis ({formatFCFA(calculerFraisRetour(course.prix))} au client)
              </button>
              <button
                onClick={() => declencherResolution(course, "annulee")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Annuler la course
              </button>
              <button
                onClick={() => declencherResolution(course, "remboursement_partiel")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Remboursement partiel
              </button>
              <button
                onClick={() => declencherResolution(course, "remboursement_total")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Remboursement total ({formatFCFA(course.prix)})
              </button>
              <button
                onClick={() => declencherResolution(course, "rejetee")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Rejeter la demande
              </button>
            </div>

            {panneauCourse && (
              <div className="mt-4 rounded-xl border border-colimo-neutre-clair bg-colimo-fond p-4">
                <p className="mb-3 text-sm font-medium text-colimo-neutre-fonce">
                  {RESOLUTION_LITIGE_LABELS[panneauCourse.resolution]}
                </p>

                {panneauCourse.resolution === "annulee" && (
                  <select
                    value={motifPanneau}
                    onChange={(e) => setMotifPanneau(e.target.value as MotifAnnulationAdmin)}
                    className="mb-3 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-xs"
                  >
                    <option value="">Motif de l'annulation…</option>
                    {MOTIFS_ADMIN.map((m) => (
                      <option key={m.valeur} value={m.valeur}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                )}

                {panneauCourse.resolution === "remboursement_partiel" && (
                  <input
                    type="number"
                    min={1}
                    max={course.prix}
                    value={montantPanneau}
                    onChange={(e) => setMontantPanneau(e.target.value)}
                    placeholder={`Montant à rembourser (FCFA, max ${formatFCFA(course.prix)})`}
                    className="mb-3 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-xs"
                  />
                )}

                <textarea
                  value={commentairePanneau}
                  onChange={(e) => setCommentairePanneau(e.target.value)}
                  placeholder={
                    panneauCourse.resolution === "rejetee"
                      ? "Raison du rejet (obligatoire)…"
                      : panneauCourse.resolution === "annulee" && motifPanneau === "autre"
                        ? "Précisez le motif (obligatoire)…"
                        : "Commentaire (facultatif)…"
                  }
                  className="mb-3 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-xs"
                  rows={2}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => confirmerPanneau(course)}
                    disabled={enCours === course.id}
                    className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
                  >
                    Confirmer
                  </button>
                  <button
                    onClick={fermerPanneau}
                    disabled={enCours === course.id}
                    className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-white disabled:opacity-60"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
          );
        })}

        {!chargement && litiges.length === 0 && (
          <p className="rounded-2xl border border-dashed border-colimo-neutre-clair p-8 text-center text-colimo-neutre-fonce/50">
            Aucun litige en cours
          </p>
        )}
      </div>
    </div>
  );
}
