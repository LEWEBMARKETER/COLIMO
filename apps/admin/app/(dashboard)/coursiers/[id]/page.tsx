"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import BadgePill from "@/components/BadgePill";
import NiveauBadge from "@/components/NiveauBadge";
import NoteEtoiles from "@/components/NoteEtoiles";
import {
  ajouterCommentaireInterne,
  attribuerBadge,
  changerStatutCoursier,
  definirNiveauCoursier,
  desactiverCoursier,
  getBadgesCoursier,
  getCatalogueBadges,
  getCatalogueNiveaux,
  getCoursierAvecUtilisateur,
  getCourses,
  getHistoriqueCoursiers,
  reactiverCoursier,
  recalculerBadgesEtNiveau,
  retirerBadge,
  suspendreCoursier,
} from "@/lib/api";
import {
  ACTION_HISTORIQUE_COURSIER_LABELS,
  PIECE_IDENTITE_LABELS,
  STATUT_COURSIER_LABELS,
  ZONE_LABELS,
  calculerStatistiquesCoursier,
  calculerStatutEffectif,
  type BadgeCoursier,
  type BadgeCoursierAttribue,
  type CoursierAvecUtilisateur,
  type HistoriqueCoursier,
  type NiveauCoursier,
  type StatutCoursier,
} from "@colimo/shared";

const STATUTS_MODIFIABLES: StatutCoursier[] = ["en_attente_validation", "verifie", "en_ligne", "hors_ligne", "suspendu", "desactive"];
const STATUTS_ACTIFS_COURSE = new Set(["acceptee", "retrait", "en_cours"]);

function formatDuree(secondes: number | null): string {
  if (secondes === null) return "—";
  return `${Math.round(secondes / 60)} min`;
}

export default function FicheCoursierPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const coursierId = params.id;

  const [coursier, setCoursier] = useState<CoursierAvecUtilisateur | null>(null);
  const [aCourseEnCours, setACourseEnCours] = useState(false);
  const [badges, setBadges] = useState<BadgeCoursier[]>([]);
  const [badgesAttribues, setBadgesAttribues] = useState<BadgeCoursierAttribue[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauCoursier[]>([]);
  const [historique, setHistorique] = useState<HistoriqueCoursier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [nouveauStatut, setNouveauStatut] = useState<StatutCoursier>("hors_ligne");
  const [badgeAAttribuer, setBadgeAAttribuer] = useState<string>("");
  const [niveauSelectionne, setNiveauSelectionne] = useState<string>("");
  const [commentaire, setCommentaire] = useState("");

  async function charger() {
    const c = await getCoursierAvecUtilisateur(coursierId);
    if (!c) {
      setCoursier(null);
      return;
    }
    setCoursier(c);
    setNouveauStatut(c.statut);
    setNiveauSelectionne(c.niveauId ?? "");

    const [mesCourses, mesBadges, catalogueBadges, catalogueNiveaux, monHistorique] = await Promise.all([
      getCourses({}),
      getBadgesCoursier(c.id),
      getCatalogueBadges(),
      getCatalogueNiveaux(),
      getHistoriqueCoursiers({ coursierId: c.id }),
    ]);
    setACourseEnCours(mesCourses.some((course) => course.coursierId === c.utilisateurId && STATUTS_ACTIFS_COURSE.has(course.statut)));
    setBadgesAttribues(mesBadges);
    setBadges(catalogueBadges);
    setNiveaux(catalogueNiveaux);
    setHistorique(monHistorique);
  }

  useEffect(() => {
    charger().finally(() => setChargement(false));
  }, [coursierId]);

  const statistiques = useMemo(() => (coursier ? calculerStatistiquesCoursier(coursier, coursier.utilisateur) : null), [coursier]);
  const statutEffectif = coursier ? calculerStatutEffectif(coursier.statut, aCourseEnCours) : "hors_ligne";
  const niveauActuel = coursier?.niveauId ? niveaux.find((n) => n.id === coursier.niveauId) : undefined;
  const badgesDisponibles = badges.filter((b) => !badgesAttribues.some((a) => a.badgeId === b.id));

  async function enregistrerStatut() {
    if (!coursier) return;
    const motif = ["suspendu", "desactive"].includes(nouveauStatut) ? window.prompt("Motif (optionnel) :") ?? undefined : undefined;
    await changerStatutCoursier(coursier.id, nouveauStatut, { ancienStatut: coursier.statut, motif });
    await charger();
  }

  async function suspendre() {
    if (!coursier) return;
    const motif = window.prompt(
      "Motif de la suspension (obligatoire) :\nEx. mauvais comportement, documents expirés, litiges élevés, fraude, demande personnelle"
    );
    if (!motif) return;
    await suspendreCoursier(coursier.id, { motif });
    await charger();
  }

  async function reactiver() {
    if (!coursier) return;
    await reactiverCoursier(coursier.id);
    await charger();
  }

  async function desactiver() {
    if (!coursier) return;
    if (!window.confirm("Désactiver définitivement ce compte ?")) return;
    await desactiverCoursier(coursier.id);
    await charger();
  }

  async function attribuer() {
    if (!coursier || !badgeAAttribuer) return;
    await attribuerBadge(coursier.id, badgeAAttribuer);
    setBadgeAAttribuer("");
    await charger();
  }

  async function retirer(attributionId: string) {
    await retirerBadge(attributionId);
    await charger();
  }

  async function enregistrerNiveau() {
    if (!coursier || !niveauSelectionne) return;
    await definirNiveauCoursier(coursier.id, niveauSelectionne);
    await charger();
  }

  async function envoyerCommentaire() {
    if (!coursier || !commentaire.trim()) return;
    await ajouterCommentaireInterne(coursier.id, commentaire.trim());
    setCommentaire("");
    await charger();
  }

  async function recalculer() {
    if (!coursier) return;
    await recalculerBadgesEtNiveau(coursier.utilisateurId);
    await charger();
  }

  if (chargement) {
    return <p className="text-sm text-colimo-neutre-fonce/60">Chargement…</p>;
  }

  if (!coursier || !statistiques) {
    return <p className="text-sm text-colimo-neutre-fonce/60">Coursier introuvable.</p>;
  }

  const nom = coursier.utilisateur.prenom ? `${coursier.utilisateur.prenom} ${coursier.utilisateur.nom}` : coursier.utilisateur.nom;

  return (
    <div>
      <button onClick={() => router.push("/coursiers")} className="mb-4 text-sm text-colimo-neutre-fonce/60 hover:text-colimo-rouge">
        ← Retour à la liste
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {coursier.utilisateur.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coursier.utilisateur.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-colimo-neutre-clair text-xl text-colimo-neutre-fonce/50">
              {nom.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">{nom}</h1>
            <p className="text-sm text-colimo-neutre-fonce/60">{coursier.utilisateur.telephone}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatutBadge statut={statutEffectif} label={STATUT_COURSIER_LABELS[statutEffectif]} />
              {niveauActuel && <NiveauBadge nom={niveauActuel.nom} couleur={niveauActuel.couleur} icone={niveauActuel.icone} />}
            </div>
          </div>
        </div>
        <button
          onClick={recalculer}
          className="shrink-0 rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
        >
          Recalculer badges/niveau
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {badgesAttribues.map((attribution) => {
          const badge = badges.find((b) => b.id === attribution.badgeId);
          if (!badge) return null;
          return (
            <div key={attribution.id} className="flex items-center gap-1">
              <BadgePill nom={badge.nom} icone={badge.icone} couleur={badge.couleur} />
              <button onClick={() => retirer(attribution.id)} className="text-xs text-colimo-neutre-fonce/40 hover:text-colimo-rouge">
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Note moyenne" value={statistiques.noteMoyenne > 0 ? statistiques.noteMoyenne.toFixed(1) : "—"} />
        <StatCard label="Livraisons" value={String(statistiques.nombreLivraisons)} />
        <StatCard label="Taux de réussite" value={`${Math.round(statistiques.tauxReussite * 100)}%`} />
        <StatCard label="Taux d'annulation" value={`${Math.round(statistiques.tauxAnnulation * 100)}%`} />
        <StatCard label="Temps moyen de livraison" value={formatDuree(statistiques.dureeLivraisonMoyenneSecondes)} />
        <StatCard label="Ancienneté" value={`${statistiques.ancienneteJours} j`} />
        <StatCard label="Zones couvertes" value={coursier.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"} />
        <StatCard
          label="Pièce d'identité"
          value={coursier.typePieceIdentite ? PIECE_IDENTITE_LABELS[coursier.typePieceIdentite] : "—"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Statut</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value as StatutCoursier)}
              className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              {STATUTS_MODIFIABLES.map((s) => (
                <option key={s} value={s}>
                  {STATUT_COURSIER_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={enregistrerStatut}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Modifier le statut
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {coursier.statut === "suspendu" || coursier.statut === "desactive" ? (
              <button
                onClick={reactiver}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
              >
                Réactiver
              </button>
            ) : (
              <button
                onClick={suspendre}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
              >
                Suspendre
              </button>
            )}
            {coursier.statut !== "desactive" && (
              <button
                onClick={desactiver}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair"
              >
                Désactiver
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Niveau</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={niveauSelectionne}
              onChange={(e) => setNiveauSelectionne(e.target.value)}
              className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              <option value="">Aucun</option>
              {niveaux.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nom}
                </option>
              ))}
            </select>
            <button
              onClick={enregistrerNiveau}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Modifier le niveau
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Attribuer un badge</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={badgeAAttribuer}
              onChange={(e) => setBadgeAAttribuer(e.target.value)}
              className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              <option value="">Choisir un badge</option>
              {badgesDisponibles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icone} {b.nom}
                </option>
              ))}
            </select>
            <button
              onClick={attribuer}
              disabled={!badgeAAttribuer}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
            >
              Attribuer
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Commentaire interne</p>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm"
            placeholder="Visible uniquement par l'équipe COLIMO"
          />
          <button
            onClick={envoyerCommentaire}
            disabled={!commentaire.trim()}
            className="mt-2 rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-3 font-titre text-base font-semibold text-colimo-neutre-fonce">Historique</p>
        <div className="overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Détail</th>
                <th className="px-4 py-3 font-medium">Motif / commentaire</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((h) => (
                <tr key={h.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">{new Date(h.createdAt).toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3">{ACTION_HISTORIQUE_COURSIER_LABELS[h.action]}</td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                    {h.ancienneValeur && <span>{h.ancienneValeur} → </span>}
                    {h.nouvelleValeur ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                    {h.motif && <p>Motif : {h.motif}</p>}
                    {h.commentaire && <p>{h.commentaire}</p>}
                  </td>
                </tr>
              ))}
              {historique.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                    Aucun historique
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
