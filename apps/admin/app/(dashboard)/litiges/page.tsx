"use client";

import { useEffect, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import { getCourses, getLitiges, getUtilisateurs, patchCourse } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  calculerFraisRetour,
  COURSE_STATUS_LABELS,
  estUrlHttpSure,
  formatFCFA,
  LITIGE_MOTIF_LABELS,
  ZONE_LABELS,
  type Course,
  type Litige,
  type Utilisateur,
} from "@colimo/shared";

export default function LitigesPage() {
  const [litiges, setLitiges] = useState<Course[]>([]);
  const [rapports, setRapports] = useState<Litige[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    charger();
  }, []);

  function charger() {
    setChargement(true);
    return Promise.all([getCourses({ statut: "litige" }), getLitiges(), getUtilisateurs()])
      .then(([courses, litigesDetails, users]) => {
        setLitiges(courses);
        setRapports(litigesDetails);
        setUtilisateurs(users);
      })
      .finally(() => setChargement(false));
  }

  function nomUtilisateur(id: string): string {
    return utilisateurs.find((u) => u.id === id)?.nom ?? "—";
  }

  function rapportPourCourse(courseId: string): Litige | undefined {
    // Le plus récent signalement pour cette course (getLitiges trie déjà par date décroissante).
    return rapports.find((r) => r.courseId === courseId);
  }

  async function resoudre(course: Course, action: "confirmer" | "annuler" | "retour") {
    const confirmations: Record<typeof action, string> = {
      confirmer: `Confirmer que la course ${course.numeroCommande} a bien été livrée ?`,
      annuler: `Annuler la course ${course.numeroCommande} sans frais pour le client ?`,
      retour: `Marquer le colis de ${course.numeroCommande} comme retourné ? Le client sera facturé ${formatFCFA(
        calculerFraisRetour(course.prix)
      )} (50% du prix de la course), conformément à la politique de retour.`,
    };
    if (!window.confirm(confirmations[action])) return;

    const resolutions: Record<typeof action, string> = {
      confirmer: "livraison confirmée",
      annuler: "course annulée sans frais",
      retour: "colis retourné",
    };

    setEnCours(course.id);
    try {
      let misAJour: Course;
      if (action === "confirmer") {
        misAJour = await patchCourse(course.id, { statut: "confirmee" });
      } else if (action === "annuler") {
        misAJour = await patchCourse(course.id, { statut: "annulee", fraisRetour: 0 });
      } else {
        misAJour = await patchCourse(course.id, { statut: "retournee", fraisRetour: calculerFraisRetour(course.prix) });
      }
      await notifierEvenement("litige_resolu", {
        destinataire: misAJour.telephoneDestinataire,
        variables: {
          nom_client: misAJour.nomDestinataire ?? "client",
          numero_commande: misAJour.numeroCommande,
          resolution: resolutions[action],
        },
      });
      await notifierEvenement("notification_litige_resolu", {
        destinataire: misAJour.clientId,
        utilisateurId: misAJour.clientId,
        variables: { numero_commande: misAJour.numeroCommande, resolution: resolutions[action] },
      });
      if (misAJour.coursierId) {
        await notifierEvenement("notification_litige_resolu", {
          destinataire: misAJour.coursierId,
          utilisateurId: misAJour.coursierId,
          variables: { numero_commande: misAJour.numeroCommande, resolution: resolutions[action] },
        });
      }
      setLitiges((prev) => prev.filter((c) => c.id !== course.id));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Litiges</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Courses signalées nécessitant une intervention</p>

      <div className="mt-6 space-y-3">
        {litiges.map((course) => {
          const rapport = rapportPourCourse(course.id);
          return (
          <div key={course.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-colimo-neutre-fonce">
                  {course.numeroCommande} · {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
                </p>
                <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
                  Client : {nomUtilisateur(course.clientId)} · Coursier :{" "}
                  {course.coursierId ? nomUtilisateur(course.coursierId) : "—"}
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
                onClick={() => resoudre(course, "confirmer")}
                disabled={enCours === course.id}
                className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
              >
                Confirmer la livraison
              </button>
              <button
                onClick={() => resoudre(course, "retour")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Colis retourné (50% au client — {formatFCFA(calculerFraisRetour(course.prix))})
              </button>
              <button
                onClick={() => resoudre(course, "annuler")}
                disabled={enCours === course.id}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
              >
                Annuler sans frais
              </button>
            </div>
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
