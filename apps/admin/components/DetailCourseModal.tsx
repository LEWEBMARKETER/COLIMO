import StatutBadge from "@/components/StatutBadge";
import {
  CATEGORIE_COLIS_LABELS,
  COURSE_STATUS_LABELS,
  METHODE_VERIFICATION_LIVRAISON_LABELS,
  MODE_PAIEMENT_LABELS,
  QUI_PAIE_LABELS,
  RESULTAT_VERIFICATION_LIVRAISON_LABELS,
  ZONE_LABELS,
  formatFCFA,
  type ConfirmationLivraison,
  type Course,
  type Utilisateur,
  type ValidationAdminLivraison,
} from "@colimo/shared";

function formatDateHeure(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function Champ({ label, valeur }: { label: string; valeur: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-colimo-neutre-fonce/50">{label}</p>
      <p className="mt-0.5 text-sm text-colimo-neutre-fonce">{valeur || valeur === 0 ? valeur : "—"}</p>
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-colimo-neutre-clair pt-4 first:border-t-0 first:pt-0">
      <h3 className="font-titre text-sm font-semibold text-colimo-neutre-fonce">{titre}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

interface DetailCourseModalProps {
  course: Course;
  client: Utilisateur | undefined;
  coursier: Utilisateur | undefined;
  confirmation: ConfirmationLivraison | undefined;
  validationsAdmin?: ValidationAdminLivraison[];
  nomUtilisateur?: (id: string) => string;
  onClose: () => void;
}

// Aperçu complet d'une course — le tableau de /courses n'affiche qu'un
// sous-ensemble (dense mais partiel) des champs de la table courses ; ce
// panneau réutilise les mêmes données déjà chargées par la page (aucune
// requête supplémentaire), simplement organisées par section.
export default function DetailCourseModal({
  course,
  client,
  coursier,
  confirmation,
  validationsAdmin = [],
  nomUtilisateur,
  onClose,
}: DetailCourseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-titre text-lg font-semibold text-colimo-neutre-fonce">{course.numeroCommande}</h2>
            <p className="mt-1 text-xs text-colimo-neutre-fonce/50">Code de suivi : {course.codeSuivi}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatutBadge statut={course.statut} label={COURSE_STATUS_LABELS[course.statut]} />
            <button
              onClick={onClose}
              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <Section titre="Client & coursier">
            <Champ label="Client" valeur={client ? `${client.nom} — ${client.telephone}` : "—"} />
            <Champ label="Coursier" valeur={coursier ? `${coursier.nom} — ${coursier.telephone}` : "Non assigné"} />
          </Section>

          <Section titre="Trajet">
            <Champ label="Zone de départ" valeur={ZONE_LABELS[course.zoneDepart]} />
            <Champ label="Zone d'arrivée" valeur={ZONE_LABELS[course.zoneArrivee]} />
            <Champ label="Adresse de retrait" valeur={course.adresseDepart} />
            <Champ label="Adresse de livraison" valeur={course.adresseArrivee} />
            <Champ label="Repère (retrait)" valeur={course.repereDepart} />
            <Champ label="Repère (livraison)" valeur={course.repereArrivee} />
          </Section>

          <Section titre="Colis">
            <Champ label="Catégorie" valeur={CATEGORIE_COLIS_LABELS[course.categorieColis]} />
            <Champ label="Type" valeur={course.typeColis} />
            <Champ label="Taille" valeur={course.tailleColis} />
            <Champ label="Poids estimé" valeur={course.poidsEstime ? `${course.poidsEstime} kg` : null} />
            <Champ label="Valeur déclarée" valeur={course.valeurDeclaree ? formatFCFA(course.valeurDeclaree) : null} />
            <Champ label="Livraison prioritaire" valeur={course.livraisonPrioritaire ? "Oui" : "Non"} />
            <Champ label="Instructions" valeur={course.instructions} />
          </Section>

          <Section titre="Expéditeur & destinataire">
            <Champ
              label="Expéditeur"
              valeur={course.nomExpediteur ? `${course.nomExpediteur} — ${course.telephoneExpediteur ?? "—"}` : null}
            />
            <Champ
              label="Destinataire"
              valeur={course.nomDestinataire ? `${course.nomDestinataire} — ${course.telephoneDestinataire ?? "—"}` : null}
            />
          </Section>

          <Section titre="Paiement">
            <Champ label="Mode de paiement" valeur={MODE_PAIEMENT_LABELS[course.modePaiement]} />
            <Champ label="Qui paie" valeur={QUI_PAIE_LABELS[course.quiPaie]} />
            <Champ label="Prix" valeur={formatFCFA(course.prix)} />
            <Champ label="Commission" valeur={formatFCFA(course.commission)} />
            <Champ label="Réduction promo" valeur={course.reductionPromo ? formatFCFA(course.reductionPromo) : null} />
            <Champ label="Frais de retour" valeur={course.fraisRetour ? formatFCFA(course.fraisRetour) : null} />
          </Section>

          <Section titre="Historique">
            <Champ label="Créée le" valeur={formatDateHeure(course.createdAt)} />
            <Champ label="Acceptée le" valeur={formatDateHeure(course.accepteeAt)} />
            <Champ label="Colis récupéré le" valeur={formatDateHeure(course.recupereeAt)} />
            <Champ label="Livrée le" valeur={formatDateHeure(course.livreeAt)} />
            <Champ label="Confirmée le" valeur={formatDateHeure(course.confirmeeAt)} />
            {course.annuleeAt && <Champ label="Annulée le" valeur={formatDateHeure(course.annuleeAt)} />}
            {course.motifAnnulation && <Champ label="Motif d'annulation" valeur={course.motifAnnulation} />}
            {course.commentaireAnnulation && (
              <Champ label="Commentaire d'annulation" valeur={course.commentaireAnnulation} />
            )}
          </Section>

          {confirmation && (
            <Section titre="Confirmation de livraison">
              <Champ label="Code OTP vérifié" valeur={confirmation.otpVerifieAt ? "Oui" : "Non"} />
              <Champ
                label="Confirmation client"
                valeur={
                  confirmation.clientConfirmationStatut === "confirme"
                    ? "Confirmée"
                    : confirmation.clientConfirmationStatut === "auto_finalise"
                      ? "Finalisée automatiquement"
                      : confirmation.clientConfirmationStatut === "signale"
                        ? "Signalée par le client"
                        : "En attente"
                }
              />
              {confirmation.preuvePhotoUrl && (
                <div className="col-span-2">
                  <p className="text-xs text-colimo-neutre-fonce/50">Preuve de livraison</p>
                  <a
                    href={confirmation.preuvePhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-block text-sm font-medium text-colimo-rouge hover:underline"
                  >
                    📷 Voir la photo
                  </a>
                </div>
              )}
            </Section>
          )}

          {validationsAdmin.length > 0 && (
            <div className="border-t border-colimo-neutre-clair pt-4">
              <h3 className="font-titre text-sm font-semibold text-colimo-neutre-fonce">
                Validations administratives
              </h3>
              <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">Information interne au back-office</p>
              <div className="mt-3 flex flex-col gap-3">
                {validationsAdmin.map((v) => (
                  <div key={v.id} className="rounded-lg bg-colimo-fond p-3">
                    <p className="text-xs text-colimo-neutre-fonce/50">{formatDateHeure(v.createdAt)}</p>
                    <p className="mt-0.5 text-sm font-medium text-colimo-neutre-fonce">
                      {v.resultat === "confirmee" && "✓ Livraison confirmée administrativement"}
                      {v.resultat === "contestee" && "⚠ Livraison contestée — passée en litige"}
                      {v.resultat === "impossible" && "⏳ Vérification impossible — dernière tentative"}
                    </p>
                    <p className="mt-1 text-xs text-colimo-neutre-fonce/70">
                      Vérification : {METHODE_VERIFICATION_LIVRAISON_LABELS[v.methodeVerification]} · Résultat :{" "}
                      {RESULTAT_VERIFICATION_LIVRAISON_LABELS[v.resultat]}
                    </p>
                    <p className="mt-0.5 text-xs text-colimo-neutre-fonce/70">
                      Validée par : {nomUtilisateur ? nomUtilisateur(v.administrateurId) : v.administrateurId}
                    </p>
                    {v.note && <p className="mt-1 text-sm text-colimo-neutre-fonce/80">« {v.note} »</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
