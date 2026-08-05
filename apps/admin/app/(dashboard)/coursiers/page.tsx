"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import BadgePill from "@/components/BadgePill";
import NiveauBadge from "@/components/NiveauBadge";
import NoteEtoiles from "@/components/NoteEtoiles";
import {
  desactiverCoursier,
  getBadgesCoursier,
  getCatalogueBadges,
  getCatalogueNiveaux,
  getCoursiersAvecStatutEffectif,
  getHistoriqueCoursiers,
  patchCatalogueBadge,
  patchCatalogueNiveau,
  reactiverCoursier,
  rejeterDossierCoursier,
  suspendreCoursier,
  validerDossierCoursier,
} from "@/lib/api";
import {
  ACTION_HISTORIQUE_COURSIER_LABELS,
  STATUT_COURSIER_LABELS,
  ZONE_LABELS,
  calculerStatistiquesCoursier,
  calculerTableauDeBordCoursiers,
  type ActionHistoriqueCoursier,
  type BadgeCoursier,
  type BadgeCoursierAttribue,
  type CoursierAvecStatutEffectif,
  type HistoriqueCoursier,
  type NiveauCoursier,
  type StatutCoursierEffectif,
} from "@colimo/shared";

const SECTIONS = ["dashboard", "liste", "statuts", "badges", "performances", "historique", "parametres"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  dashboard: "Dashboard",
  liste: "Liste des coursiers",
  statuts: "Statuts",
  badges: "Badges",
  performances: "Performances",
  historique: "Historique",
  parametres: "Paramètres",
};

const STATUTS_EFFECTIFS_FILTRE: StatutCoursierEffectif[] = [
  "en_attente_validation",
  "verifie",
  "en_ligne",
  "occupe",
  "hors_ligne",
  "suspendu",
  "desactive",
];

function nomCoursier(c: CoursierAvecStatutEffectif): string {
  return c.utilisateur.prenom ? `${c.utilisateur.prenom} ${c.utilisateur.nom}` : c.utilisateur.nom;
}

function formatDuree(secondes: number | null): string {
  if (secondes === null) return "—";
  const minutes = Math.round(secondes / 60);
  return `${minutes} min`;
}

export default function CoursiersPage() {
  const [coursiers, setCoursiers] = useState<CoursierAvecStatutEffectif[]>([]);
  const [badges, setBadges] = useState<BadgeCoursier[]>([]);
  const [niveaux, setNiveaux] = useState<NiveauCoursier[]>([]);
  const [badgesAttribues, setBadgesAttribues] = useState<BadgeCoursierAttribue[]>([]);
  const [historique, setHistorique] = useState<HistoriqueCoursier[]>([]);
  const [chargement, setChargement] = useState(true);
  const [section, setSection] = useState<Section>("dashboard");

  const [filtreStatut, setFiltreStatut] = useState<StatutCoursierEffectif | "tous">("tous");
  const [filtreHistoriqueCoursier, setFiltreHistoriqueCoursier] = useState<string>("tous");
  const [filtreHistoriqueAction, setFiltreHistoriqueAction] = useState<ActionHistoriqueCoursier | "toutes">("toutes");

  async function chargerTout() {
    const [c, b, n, ba, h] = await Promise.all([
      getCoursiersAvecStatutEffectif(),
      getCatalogueBadges(),
      getCatalogueNiveaux(),
      getBadgesCoursier(),
      getHistoriqueCoursiers(),
    ]);
    setCoursiers(c);
    setBadges(b);
    setNiveaux(n);
    setBadgesAttribues(ba);
    setHistorique(h);
  }

  useEffect(() => {
    chargerTout().finally(() => setChargement(false));
  }, []);

  const niveauParId = useMemo(() => new Map(niveaux.map((n) => [n.id, n])), [niveaux]);
  const badgeParId = useMemo(() => new Map(badges.map((b) => [b.id, b])), [badges]);
  const badgesParCoursier = useMemo(() => {
    const map = new Map<string, BadgeCoursierAttribue[]>();
    for (const attribution of badgesAttribues) {
      const liste = map.get(attribution.coursierId) ?? [];
      liste.push(attribution);
      map.set(attribution.coursierId, liste);
    }
    return map;
  }, [badgesAttribues]);

  const tableauDeBord = useMemo(
    () => calculerTableauDeBordCoursiers(coursiers, niveaux, badgesAttribues.length),
    [coursiers, niveaux, badgesAttribues]
  );

  const coursiersFiltres = useMemo(
    () => (filtreStatut === "tous" ? coursiers : coursiers.filter((c) => c.statutEffectif === filtreStatut)),
    [coursiers, filtreStatut]
  );

  const historiqueFiltre = useMemo(
    () =>
      historique.filter(
        (h) =>
          (filtreHistoriqueCoursier === "tous" || h.coursierId === filtreHistoriqueCoursier) &&
          (filtreHistoriqueAction === "toutes" || h.action === filtreHistoriqueAction)
      ),
    [historique, filtreHistoriqueCoursier, filtreHistoriqueAction]
  );

  async function valider(coursierId: string) {
    await validerDossierCoursier(coursierId);
    await chargerTout();
  }

  async function rejeter(coursierId: string) {
    const motif = window.prompt("Motif du rejet (optionnel) :") ?? undefined;
    await rejeterDossierCoursier(coursierId, motif || undefined);
    await chargerTout();
  }

  async function suspendre(coursier: CoursierAvecStatutEffectif) {
    const motif = window.prompt(
      `Suspendre ${nomCoursier(coursier)} — motif (obligatoire) :\nEx. mauvais comportement, documents expirés, litiges élevés, fraude, demande personnelle`
    );
    if (!motif) return;
    const commentaire = window.prompt("Commentaire interne (optionnel) :") ?? undefined;
    await suspendreCoursier(coursier.id, { motif, commentaire: commentaire || undefined });
    await chargerTout();
  }

  async function reactiver(coursier: CoursierAvecStatutEffectif) {
    if (!window.confirm(`Réactiver ${nomCoursier(coursier)} ?`)) return;
    await reactiverCoursier(coursier.id);
    await chargerTout();
  }

  async function desactiver(coursier: CoursierAvecStatutEffectif) {
    if (!window.confirm(`Désactiver définitivement ${nomCoursier(coursier)} ? Cette action ferme le compte.`)) return;
    const motif = window.prompt("Motif de la désactivation (optionnel) :") ?? undefined;
    await desactiverCoursier(coursier.id, { motif: motif || undefined });
    await chargerTout();
  }

  async function toggleBadgeActif(badge: BadgeCoursier) {
    await patchCatalogueBadge(badge.id, { actif: !badge.actif });
    await chargerTout();
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Coursiers</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Statuts, badges, niveaux, performances et historique des coursiers de la plateforme.
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-colimo-neutre-clair">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              section === s
                ? "border-colimo-rouge text-colimo-rouge"
                : "border-transparent text-colimo-neutre-fonce/60 hover:text-colimo-neutre-fonce"
            }`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {section === "dashboard" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Coursiers" value={String(coursiers.length)} sombre />
            {STATUTS_EFFECTIFS_FILTRE.map((s) => (
              <StatCard key={s} label={STATUT_COURSIER_LABELS[s]} value={String(tableauDeBord.parStatut[s])} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <p className="mb-3 font-medium text-colimo-neutre-fonce">Badges attribués</p>
              <p className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">{tableauDeBord.nombreBadgesAttribues}</p>
            </div>
            <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <p className="mb-3 font-medium text-colimo-neutre-fonce">Répartition des niveaux</p>
              <div className="flex flex-col gap-1.5 text-sm">
                {niveaux.map((n) => (
                  <div key={n.id} className="flex items-center justify-between">
                    <NiveauBadge nom={n.nom} couleur={n.couleur} icone={n.icone} />
                    <span className="text-colimo-neutre-fonce/70">{tableauDeBord.parNiveau[n.code] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ClassementCarte titre="Top 10 — meilleurs coursiers" entrees={tableauDeBord.topMeilleurs} suffixe="livraisons" />
            <ClassementCarte
              titre="Top 10 — plus rapides"
              entrees={tableauDeBord.topRapides.map((e) => ({ ...e, valeur: Math.round(e.valeur / 60) }))}
              suffixe="min/livraison"
            />
            <ClassementCarte
              titre="Top 10 — mieux notés"
              entrees={tableauDeBord.topMieuxNotes.map((e) => ({ ...e, valeur: Math.round(e.valeur * 10) / 10 }))}
              suffixe="★"
            />
          </div>
        </div>
      )}

      {section === "liste" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Niveau</th>
                <th className="px-4 py-3 font-medium">Badges</th>
                <th className="px-4 py-3 font-medium">Zones</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coursiers.map((c) => {
                const niveau = c.niveauId ? niveauParId.get(c.niveauId) : undefined;
                const mesBadges = badgesParCoursier.get(c.id) ?? [];
                return (
                  <tr key={c.id} className="border-b border-colimo-neutre-clair last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/coursiers/${c.id}`} className="font-medium text-colimo-neutre-fonce hover:text-colimo-rouge">
                        {nomCoursier(c)}
                      </Link>
                      <p className="text-xs text-colimo-neutre-fonce/50">{c.utilisateur.telephone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={c.statutEffectif} label={STATUT_COURSIER_LABELS[c.statutEffectif]} />
                    </td>
                    <td className="px-4 py-3">{niveau ? <NiveauBadge nom={niveau.nom} couleur={niveau.couleur} icone={niveau.icone} /> : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {mesBadges.slice(0, 3).map((attribution) => {
                          const badge = badgeParId.get(attribution.badgeId);
                          return badge ? <BadgePill key={attribution.id} nom={badge.nom} icone={badge.icone} couleur={badge.couleur} /> : null;
                        })}
                        {mesBadges.length > 3 && <span className="text-xs text-colimo-neutre-fonce/50">+{mesBadges.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{c.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <NoteEtoiles note={c.noteMoyenne} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.statutVerification === "en_attente" && (
                          <>
                            <button
                              onClick={() => valider(c.id)}
                              className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                            >
                              Valider
                            </button>
                            <button
                              onClick={() => rejeter(c.id)}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        <Link
                          href={`/coursiers/${c.id}`}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Voir la fiche
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!chargement && coursiers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                    Aucun coursier inscrit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {section === "statuts" && (
        <div>
          <div className="mt-6 flex items-center gap-3">
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">Filtrer par statut</label>
            <select
              value={filtreStatut}
              onChange={(e) => setFiltreStatut(e.target.value as StatutCoursierEffectif | "tous")}
              className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
            >
              <option value="tous">Tous les statuts</option>
              {STATUTS_EFFECTIFS_FILTRE.map((s) => (
                <option key={s} value={s}>
                  {STATUT_COURSIER_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coursiersFiltres.map((c) => (
                  <tr key={c.id} className="border-b border-colimo-neutre-clair last:border-0">
                    <td className="px-4 py-3 font-medium text-colimo-neutre-fonce">{nomCoursier(c)}</td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={c.statutEffectif} label={STATUT_COURSIER_LABELS[c.statutEffectif]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.statutVerification === "en_attente" && (
                          <>
                            <button
                              onClick={() => valider(c.id)}
                              className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                            >
                              Valider
                            </button>
                            <button
                              onClick={() => rejeter(c.id)}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                        {c.statut === "suspendu" || c.statut === "desactive" ? (
                          <button
                            onClick={() => reactiver(c)}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                          >
                            Réactiver
                          </button>
                        ) : (
                          c.statutVerification === "valide" && (
                            <button
                              onClick={() => suspendre(c)}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                            >
                              Suspendre
                            </button>
                          )
                        )}
                        {c.statut !== "desactive" && (
                          <button
                            onClick={() => desactiver(c)}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair"
                          >
                            Désactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!chargement && coursiersFiltres.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                      Aucun coursier pour ce filtre
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "badges" && (
        <div className="mt-6 flex flex-col gap-3">
          {badges.map((badge) => (
            <div key={badge.id} className="flex items-center justify-between rounded-2xl border border-colimo-neutre-clair bg-white p-4">
              <div className="flex items-center gap-3">
                <BadgePill nom={badge.nom} icone={badge.icone} couleur={badge.couleur} />
                <div>
                  <p className="text-sm text-colimo-neutre-fonce/70">{badge.description}</p>
                  <p className="text-xs text-colimo-neutre-fonce/40">
                    {badge.modeAttribution === "automatique" ? "Attribution automatique" : "Attribution manuelle"} · code : {badge.code}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatutBadge statut={badge.actif ? "actif" : "hors_ligne"} label={badge.actif ? "Actif" : "Inactif"} />
                <button
                  onClick={() => toggleBadgeActif(badge)}
                  className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                >
                  {badge.actif ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "performances" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Livraisons</th>
                <th className="px-4 py-3 font-medium">Taux de réussite</th>
                <th className="px-4 py-3 font-medium">Taux d&apos;annulation</th>
                <th className="px-4 py-3 font-medium">Durée moyenne</th>
              </tr>
            </thead>
            <tbody>
              {coursiers.map((c) => {
                const stats = calculerStatistiquesCoursier(c, c.utilisateur);
                return (
                  <tr key={c.id} className="border-b border-colimo-neutre-clair last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/coursiers/${c.id}`} className="font-medium text-colimo-neutre-fonce hover:text-colimo-rouge">
                        {nomCoursier(c)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <NoteEtoiles note={stats.noteMoyenne} />
                    </td>
                    <td className="px-4 py-3">{stats.nombreLivraisons}</td>
                    <td className="px-4 py-3">{Math.round(stats.tauxReussite * 100)}%</td>
                    <td className="px-4 py-3">{Math.round(stats.tauxAnnulation * 100)}%</td>
                    <td className="px-4 py-3">{formatDuree(stats.dureeLivraisonMoyenneSecondes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {section === "historique" && (
        <div>
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Coursier</label>
              <select
                value={filtreHistoriqueCoursier}
                onChange={(e) => setFiltreHistoriqueCoursier(e.target.value)}
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              >
                <option value="tous">Tous les coursiers</option>
                {coursiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nomCoursier(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Action</label>
              <select
                value={filtreHistoriqueAction}
                onChange={(e) => setFiltreHistoriqueAction(e.target.value as ActionHistoriqueCoursier | "toutes")}
                className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
              >
                <option value="toutes">Toutes les actions</option>
                {Object.entries(ACTION_HISTORIQUE_COURSIER_LABELS).map(([action, label]) => (
                  <option key={action} value={action}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Coursier</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Détail</th>
                  <th className="px-4 py-3 font-medium">Motif / commentaire</th>
                </tr>
              </thead>
              <tbody>
                {historiqueFiltre.map((h) => {
                  const coursier = coursiers.find((c) => c.id === h.coursierId);
                  return (
                    <tr key={h.id} className="border-b border-colimo-neutre-clair last:border-0">
                      <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">{new Date(h.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3">{coursier ? nomCoursier(coursier) : "—"}</td>
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
                  );
                })}
                {!chargement && historiqueFiltre.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                      Aucune entrée pour ce filtre
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === "parametres" && (
        <ParametresCoursiers niveaux={niveaux} badges={badges} onEnregistre={chargerTout} />
      )}
    </div>
  );
}

function ClassementCarte({
  titre,
  entrees,
  suffixe,
}: {
  titre: string;
  entrees: { coursierId: string; nom: string; valeur: number }[];
  suffixe: string;
}) {
  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <p className="mb-3 font-medium text-colimo-neutre-fonce">{titre}</p>
      <div className="flex flex-col gap-1.5 text-sm">
        {entrees.map((e, index) => (
          <div key={e.coursierId} className="flex items-center justify-between text-colimo-neutre-fonce/70">
            <span>
              {index + 1}. {e.nom}
            </span>
            <span className="font-medium text-colimo-neutre-fonce">
              {e.valeur} {suffixe}
            </span>
          </div>
        ))}
        {entrees.length === 0 && <p className="text-colimo-neutre-fonce/50">Pas assez de données</p>}
      </div>
    </div>
  );
}

function ParametresCoursiers({
  niveaux,
  badges,
  onEnregistre,
}: {
  niveaux: NiveauCoursier[];
  badges: BadgeCoursier[];
  onEnregistre: () => Promise<void>;
}) {
  const [brouillonsNiveaux, setBrouillonsNiveaux] = useState<Record<string, { nom: string; seuil: string; couleur: string }>>({});
  const [brouillonsBadges, setBrouillonsBadges] = useState<Record<string, { description: string; couleur: string; regle: string }>>({});

  function brouillonNiveau(n: NiveauCoursier) {
    return brouillonsNiveaux[n.id] ?? { nom: n.nom, seuil: String(n.seuilLivraisonsMin), couleur: n.couleur };
  }

  function brouillonBadge(b: BadgeCoursier) {
    return brouillonsBadges[b.id] ?? { description: b.description, couleur: b.couleur, regle: JSON.stringify(b.regle) };
  }

  async function enregistrerNiveau(n: NiveauCoursier) {
    const brouillon = brouillonNiveau(n);
    await patchCatalogueNiveau(n.id, {
      nom: brouillon.nom,
      seuilLivraisonsMin: Number(brouillon.seuil) || 0,
      couleur: brouillon.couleur,
    });
    await onEnregistre();
  }

  async function enregistrerBadge(b: BadgeCoursier) {
    const brouillon = brouillonBadge(b);
    let regle = b.regle;
    try {
      regle = JSON.parse(brouillon.regle);
    } catch {
      window.alert("Les seuils (JSON) sont invalides — enregistrement annulé pour ce badge.");
      return;
    }
    await patchCatalogueBadge(b.id, { description: brouillon.description, couleur: brouillon.couleur, regle });
    await onEnregistre();
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div>
        <h2 className="mb-3 font-titre text-base font-semibold text-colimo-neutre-fonce">Niveaux</h2>
        <div className="flex flex-col gap-3">
          {niveaux.map((n) => {
            const brouillon = brouillonNiveau(n);
            return (
              <div key={n.id} className="flex flex-wrap items-end gap-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">Nom</label>
                  <input
                    value={brouillon.nom}
                    onChange={(e) => setBrouillonsNiveaux((prev) => ({ ...prev, [n.id]: { ...brouillon, nom: e.target.value } }))}
                    className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">Seuil (livraisons min.)</label>
                  <input
                    type="number"
                    value={brouillon.seuil}
                    onChange={(e) => setBrouillonsNiveaux((prev) => ({ ...prev, [n.id]: { ...brouillon, seuil: e.target.value } }))}
                    className="w-32 rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">Couleur</label>
                  <input
                    type="color"
                    value={brouillon.couleur}
                    onChange={(e) => setBrouillonsNiveaux((prev) => ({ ...prev, [n.id]: { ...brouillon, couleur: e.target.value } }))}
                    className="h-9 w-16 rounded border border-colimo-neutre-clair"
                  />
                </div>
                <NiveauBadge nom={brouillon.nom} couleur={brouillon.couleur} icone={n.icone} />
                <button
                  onClick={() => enregistrerNiveau(n)}
                  className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                >
                  Enregistrer
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-titre text-base font-semibold text-colimo-neutre-fonce">Badges</h2>
        <div className="flex flex-col gap-3">
          {badges.map((b) => {
            const brouillon = brouillonBadge(b);
            return (
              <div key={b.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <BadgePill nom={b.nom} icone={b.icone} couleur={brouillon.couleur} />
                  <span className="text-xs text-colimo-neutre-fonce/50">code : {b.code}</span>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex min-w-[220px] flex-1 flex-col gap-1">
                    <label className="text-xs font-medium text-colimo-neutre-fonce/60">Description</label>
                    <input
                      value={brouillon.description}
                      onChange={(e) =>
                        setBrouillonsBadges((prev) => ({ ...prev, [b.id]: { ...brouillon, description: e.target.value } }))
                      }
                      className="rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-colimo-neutre-fonce/60">Couleur</label>
                    <input
                      type="color"
                      value={brouillon.couleur}
                      onChange={(e) => setBrouillonsBadges((prev) => ({ ...prev, [b.id]: { ...brouillon, couleur: e.target.value } }))}
                      className="h-9 w-16 rounded border border-colimo-neutre-clair"
                    />
                  </div>
                  {b.modeAttribution === "automatique" && (
                    <div className="flex min-w-[260px] flex-1 flex-col gap-1">
                      <label className="text-xs font-medium text-colimo-neutre-fonce/60">Seuils (JSON)</label>
                      <input
                        value={brouillon.regle}
                        onChange={(e) => setBrouillonsBadges((prev) => ({ ...prev, [b.id]: { ...brouillon, regle: e.target.value } }))}
                        className="rounded-lg border border-colimo-neutre-clair px-3 py-2 font-mono text-xs"
                      />
                    </div>
                  )}
                  <button
                    onClick={() => enregistrerBadge(b)}
                    className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
