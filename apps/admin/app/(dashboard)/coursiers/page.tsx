"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
import BadgePill from "@/components/BadgePill";
import NiveauBadge from "@/components/NiveauBadge";
import NoteEtoiles from "@/components/NoteEtoiles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  desactiverCoursier,
  enregistrerGrillePaliersCommission,
  getBadgesCoursier,
  getCatalogueBadges,
  getCatalogueNiveaux,
  getCataloguePaliersCommission,
  getCoursiersAvecStatutEffectif,
  getHistoriqueCoursiers,
  getPerformancesMensuelles,
  patchCatalogueBadge,
  patchCatalogueNiveau,
  reactiverCoursier,
  rejeterDossierCoursier,
  suspendreCoursier,
  supprimerCompteUtilisateur,
  validerDossierCoursier,
} from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  ACTION_HISTORIQUE_COURSIER_LABELS,
  STATUT_COURSIER_LABELS,
  ZONE_LABELS,
  calculerProgressionPalier,
  calculerStatistiquesCoursier,
  calculerTableauDeBordCoursiers,
  estCompteSupprime,
  formatFCFA,
  type ActionHistoriqueCoursier,
  type BadgeCoursier,
  type BadgeCoursierAttribue,
  type CoursierAvecStatutEffectif,
  type EntreeGrillePalier,
  type HistoriqueCoursier,
  type NiveauCoursier,
  type PalierCommission,
  type PerformanceMensuelleCoursier,
  type StatutCoursierEffectif,
  type Zone,
} from "@colimo/shared";

const SECTIONS = ["dashboard", "liste", "statuts", "badges", "performances", "commissions", "historique", "parametres"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  dashboard: "Dashboard",
  liste: "Liste des coursiers",
  statuts: "Statuts",
  badges: "Badges",
  performances: "Performances",
  commissions: "Commissions & Paliers",
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
  const [afficherSupprimes, setAfficherSupprimes] = useState(false);
  const [coursierARejeter, setCoursierARejeter] = useState<string | null>(null);
  const [motifRejet, setMotifRejet] = useState("");
  const [coursierASuspendre, setCoursierASuspendre] = useState<CoursierAvecStatutEffectif | null>(null);
  const [motifSuspension, setMotifSuspension] = useState("");
  const [commentaireSuspension, setCommentaireSuspension] = useState("");
  const [coursierADesactiver, setCoursierADesactiver] = useState<CoursierAvecStatutEffectif | null>(null);
  const [motifDesactivation, setMotifDesactivation] = useState("");
  const [coursierASupprimer, setCoursierASupprimer] = useState<CoursierAvecStatutEffectif | null>(null);
  const [motifSuppressionCoursier, setMotifSuppressionCoursier] = useState("");

  const [performancesCommission, setPerformancesCommission] = useState<PerformanceMensuelleCoursier[]>([]);
  const [paliersCommission, setPaliersCommission] = useState<PalierCommission[]>([]);
  const [commissionChargee, setCommissionChargee] = useState(false);
  const [filtreMoisCommission, setFiltreMoisCommission] = useState(() => new Date().toISOString().slice(0, 7) + "-01");
  const [filtrePalierCommission, setFiltrePalierCommission] = useState<string>("tous");
  const [filtreCoursierCommission, setFiltreCoursierCommission] = useState<string>("tous");
  const [filtreZoneCommission, setFiltreZoneCommission] = useState<Zone | "toutes">("toutes");

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

  async function chargerCommissions() {
    const [p, gr] = await Promise.all([
      getPerformancesMensuelles({ mois: filtreMoisCommission }),
      getCataloguePaliersCommission(),
    ]);
    setPerformancesCommission(p);
    setPaliersCommission(gr);
  }

  // Chargée seulement à la première visite de l'onglet (page déjà lourde,
  // cf. chargerTout ci-dessus) — rechargée explicitement au changement de
  // mois via le filtre, pas par un effet couplé à chargerTout (requêtes
  // indépendantes).
  useEffect(() => {
    if (section === "commissions" && !commissionChargee) {
      chargerCommissions().then(() => setCommissionChargee(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (!commissionChargee) return;
    getPerformancesMensuelles({ mois: filtreMoisCommission }).then(setPerformancesCommission);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtreMoisCommission]);

  const coursierParId = useMemo(() => new Map(coursiers.map((c) => [c.id, c])), [coursiers]);
  const palierParId = useMemo(() => new Map(paliersCommission.map((p) => [p.id, p])), [paliersCommission]);

  const performancesCommissionFiltrees = useMemo(
    () =>
      performancesCommission.filter((perf) => {
        const coursier = coursierParId.get(perf.coursierId);
        if (filtrePalierCommission !== "tous" && perf.palierId !== filtrePalierCommission) return false;
        if (filtreCoursierCommission !== "tous" && perf.coursierId !== filtreCoursierCommission) return false;
        if (filtreZoneCommission !== "toutes" && !coursier?.zonesCouvertes.includes(filtreZoneCommission)) return false;
        return true;
      }),
    [performancesCommission, coursierParId, filtrePalierCommission, filtreCoursierCommission, filtreZoneCommission]
  );

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

  const nombreSupprimes = useMemo(
    () => coursiers.filter((c) => estCompteSupprime(c.utilisateur.telephone)).length,
    [coursiers]
  );

  // Un coursier supprimé (anonymisé) garde statut = "desactive", mais ça ne
  // suffit pas à le repérer : une désactivation manuelle normale (sans
  // suppression) produit exactement le même statut. Seul le préfixe posé
  // par la route de suppression sur le téléphone est un signal fiable
  // (cf. packages/shared/src/comptes/types.ts).
  const coursiersVisibles = useMemo(
    () => (afficherSupprimes ? coursiers : coursiers.filter((c) => !estCompteSupprime(c.utilisateur.telephone))),
    [coursiers, afficherSupprimes]
  );

  const tableauDeBord = useMemo(
    () => calculerTableauDeBordCoursiers(coursiersVisibles, niveaux, badgesAttribues.length),
    [coursiersVisibles, niveaux, badgesAttribues]
  );

  const coursiersFiltres = useMemo(
    () => (filtreStatut === "tous" ? coursiersVisibles : coursiersVisibles.filter((c) => c.statutEffectif === filtreStatut)),
    [coursiersVisibles, filtreStatut]
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
    const coursier = coursiers.find((c) => c.id === coursierId);
    await validerDossierCoursier(coursierId);
    if (coursier) {
      const prenom = coursier.utilisateur.prenom ?? coursier.utilisateur.nom;
      await notifierEvenement("coursier_compte_valide", {
        destinataire: coursier.utilisateur.telephone,
        variables: { prenom },
      });
      await notifierEvenement("notification_coursier_compte_valide", {
        destinataire: coursier.utilisateurId,
        utilisateurId: coursier.utilisateurId,
        variables: { prenom },
      });
    }
    await chargerTout();
  }

  async function confirmerRejet() {
    if (!coursierARejeter) return;
    await rejeterDossierCoursier(coursierARejeter, motifRejet.trim() || undefined);
    setCoursierARejeter(null);
    setMotifRejet("");
    await chargerTout();
  }

  function ouvrirSuspension(coursier: CoursierAvecStatutEffectif) {
    if (coursier.aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le suspendre.");
      return;
    }
    setCoursierASuspendre(coursier);
    setMotifSuspension("");
    setCommentaireSuspension("");
  }

  async function confirmerSuspension() {
    if (!coursierASuspendre || !motifSuspension.trim()) return;
    try {
      await suspendreCoursier(coursierASuspendre.id, {
        motif: motifSuspension.trim(),
        commentaire: commentaireSuspension.trim() || undefined,
      });
      await chargerTout();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de suspendre ce coursier.");
    } finally {
      setCoursierASuspendre(null);
      setMotifSuspension("");
      setCommentaireSuspension("");
    }
  }

  async function reactiver(coursier: CoursierAvecStatutEffectif) {
    try {
      await reactiverCoursier(coursier.id);
      await chargerTout();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de réactiver ce coursier.");
    }
  }

  function ouvrirDesactivation(coursier: CoursierAvecStatutEffectif) {
    if (coursier.aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le désactiver.");
      return;
    }
    setCoursierADesactiver(coursier);
    setMotifDesactivation("");
  }

  async function confirmerDesactivation() {
    if (!coursierADesactiver) return;
    try {
      await desactiverCoursier(coursierADesactiver.id, { motif: motifDesactivation.trim() || undefined });
      await chargerTout();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de désactiver ce coursier.");
    } finally {
      setCoursierADesactiver(null);
      setMotifDesactivation("");
    }
  }

  function ouvrirSuppression(coursier: CoursierAvecStatutEffectif) {
    if (coursier.aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le supprimer.");
      return;
    }
    setCoursierASupprimer(coursier);
    setMotifSuppressionCoursier("");
  }

  async function confirmerSuppressionCoursier() {
    if (!coursierASupprimer) return;
    try {
      const resultat = await supprimerCompteUtilisateur(
        coursierASupprimer.utilisateurId,
        motifSuppressionCoursier.trim() || undefined
      );
      window.alert(
        resultat.mode === "suppression_definitive"
          ? `Compte de ${nomCoursier(coursierASupprimer)} supprimé définitivement.`
          : `Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement (l'historique de courses/paiements est conservé).`
      );
      await chargerTout();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de supprimer ce compte.");
    } finally {
      setCoursierASupprimer(null);
      setMotifSuppressionCoursier("");
    }
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

      {nombreSupprimes > 0 && (
        <label className="mt-3 flex items-center gap-2 text-xs text-colimo-neutre-fonce/60">
          <input type="checkbox" checked={afficherSupprimes} onChange={(e) => setAfficherSupprimes(e.target.checked)} />
          Afficher les comptes supprimés ({nombreSupprimes})
        </label>
      )}

      {section === "dashboard" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Coursiers" value={String(coursiersVisibles.length)} sombre />
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
          <Table>
            <TableHeader>
              <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Badges</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursiersVisibles.map((c) => {
                const niveau = c.niveauId ? niveauParId.get(c.niveauId) : undefined;
                const mesBadges = badgesParCoursier.get(c.id) ?? [];
                return (
                  <TableRow key={c.id} className="border-colimo-neutre-clair">
                    <TableCell>
                      <Link href={`/coursiers/${c.id}`} className="font-medium text-colimo-neutre-fonce hover:text-colimo-rouge">
                        {nomCoursier(c)}
                      </Link>
                      <p className="text-xs text-colimo-neutre-fonce/50">{c.utilisateur.telephone}</p>
                    </TableCell>
                    <TableCell>
                      <StatutBadge statut={c.statutEffectif} label={STATUT_COURSIER_LABELS[c.statutEffectif]} />
                    </TableCell>
                    <TableCell>{niveau ? <NiveauBadge nom={niveau.nom} couleur={niveau.couleur} icone={niveau.icone} /> : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mesBadges.slice(0, 3).map((attribution) => {
                          const badge = badgeParId.get(attribution.badgeId);
                          return badge ? <BadgePill key={attribution.id} nom={badge.nom} icone={badge.icone} couleur={badge.couleur} /> : null;
                        })}
                        {mesBadges.length > 3 && <span className="text-xs text-colimo-neutre-fonce/50">+{mesBadges.length - 3}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{c.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <NoteEtoiles note={c.noteMoyenne} />
                    </TableCell>
                    <TableCell>
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
                              onClick={() => setCoursierARejeter(c.id)}
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
                          👁️ Voir la fiche
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!chargement && coursiersVisibles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-colimo-neutre-fonce/50">
                    Aucun coursier inscrit
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {section === "statuts" && (
        <div>
          <div className="mt-6 flex items-center gap-3">
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">Filtrer par statut</label>
            <Select value={filtreStatut} onValueChange={(v) => setFiltreStatut(v as StatutCoursierEffectif | "tous")}>
              <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les statuts</SelectItem>
                {STATUTS_EFFECTIFS_FILTRE.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_COURSIER_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coursiersFiltres.map((c) => (
                  <TableRow key={c.id} className="border-colimo-neutre-clair">
                    <TableCell className="font-medium text-colimo-neutre-fonce">{nomCoursier(c)}</TableCell>
                    <TableCell>
                      <StatutBadge statut={c.statutEffectif} label={STATUT_COURSIER_LABELS[c.statutEffectif]} />
                    </TableCell>
                    <TableCell>
                      {estCompteSupprime(c.utilisateur.telephone) ? (
                        <span className="text-xs text-colimo-neutre-fonce/40">Compte supprimé — aucune action possible</span>
                      ) : (
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
                                onClick={() => setCoursierARejeter(c.id)}
                                className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          {c.statut === "suspendu" || c.statut === "desactive" ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair">
                                  ♻️ Réactiver
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Réactiver ce coursier ?</AlertDialogTitle>
                                  <AlertDialogDescription>Réactiver {nomCoursier(c)} ?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => reactiver(c)}>Réactiver</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            c.statutVerification === "valide" && (
                              <button
                                onClick={() => ouvrirSuspension(c)}
                                disabled={c.aCourseEnCours}
                                title={c.aCourseEnCours ? "Course active en cours — réaffectez-la avant de suspendre" : undefined}
                                className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                ⏸️ Suspendre
                              </button>
                            )
                          )}
                          {c.statut !== "desactive" && (
                            <button
                              onClick={() => ouvrirDesactivation(c)}
                              disabled={c.aCourseEnCours}
                              title={c.aCourseEnCours ? "Course active en cours — réaffectez-la avant de désactiver" : undefined}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              🚫 Désactiver
                            </button>
                          )}
                          <button
                            onClick={() => ouvrirSuppression(c)}
                            disabled={c.aCourseEnCours}
                            title={c.aCourseEnCours ? "Course active en cours — réaffectez-la avant de supprimer" : undefined}
                            className="rounded-md border border-colimo-rouge/30 px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!chargement && coursiersFiltres.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-colimo-neutre-fonce/50">
                      Aucun coursier pour ce filtre
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
          <Table>
            <TableHeader>
              <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                <TableHead>Nom</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Livraisons</TableHead>
                <TableHead>Taux de réussite</TableHead>
                <TableHead>Taux d&apos;annulation</TableHead>
                <TableHead>Durée moyenne</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coursiersVisibles.map((c) => {
                const stats = calculerStatistiquesCoursier(c, c.utilisateur);
                return (
                  <TableRow key={c.id} className="border-colimo-neutre-clair">
                    <TableCell>
                      <Link href={`/coursiers/${c.id}`} className="font-medium text-colimo-neutre-fonce hover:text-colimo-rouge">
                        {nomCoursier(c)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <NoteEtoiles note={stats.noteMoyenne} />
                    </TableCell>
                    <TableCell>{stats.nombreLivraisons}</TableCell>
                    <TableCell>{Math.round(stats.tauxReussite * 100)}%</TableCell>
                    <TableCell>{Math.round(stats.tauxAnnulation * 100)}%</TableCell>
                    <TableCell>{formatDuree(stats.dureeLivraisonMoyenneSecondes)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {section === "commissions" && (
        <div>
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Mois</label>
              <input
                type="month"
                value={filtreMoisCommission.slice(0, 7)}
                onChange={(e) => setFiltreMoisCommission(e.target.value + "-01")}
                className="h-auto rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm text-colimo-neutre-fonce"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Palier</label>
              <Select value={filtrePalierCommission} onValueChange={setFiltrePalierCommission}>
                <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les paliers</SelectItem>
                  {paliersCommission.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Coursier</label>
              <Select value={filtreCoursierCommission} onValueChange={setFiltreCoursierCommission}>
                <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les coursiers</SelectItem>
                  {coursiersVisibles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {nomCoursier(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Zone</label>
              <Select value={filtreZoneCommission} onValueChange={(v) => setFiltreZoneCommission(v as Zone | "toutes")}>
                <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les zones</SelectItem>
                  {Object.entries(ZONE_LABELS).map(([zone, label]) => (
                    <SelectItem key={zone} value={zone}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                  <TableHead>Coursier</TableHead>
                  <TableHead>Courses du mois</TableHead>
                  <TableHead>Palier</TableHead>
                  <TableHead>Taux</TableHead>
                  <TableHead>CA généré</TableHead>
                  <TableHead>Commission COLIMO</TableHead>
                  <TableHead>Revenus net coursier</TableHead>
                  <TableHead>Progression</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performancesCommissionFiltrees.map((perf) => {
                  const coursier = coursierParId.get(perf.coursierId);
                  const palier = perf.palierId ? palierParId.get(perf.palierId) : undefined;
                  const { prochainPalier, coursesRestantes } = calculerProgressionPalier(perf.coursesEligibles, paliersCommission);
                  return (
                    <TableRow key={perf.id} className="border-colimo-neutre-clair">
                      <TableCell>
                        {coursier ? (
                          <Link href={`/coursiers/${coursier.id}`} className="font-medium text-colimo-neutre-fonce hover:text-colimo-rouge">
                            {nomCoursier(coursier)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{perf.coursesEligibles}</TableCell>
                      <TableCell>{palier?.nom ?? "—"}</TableCell>
                      <TableCell>{perf.tauxCommissionActuel !== null ? `${Math.round(perf.tauxCommissionActuel * 100)}%` : "—"}</TableCell>
                      <TableCell>{formatFCFA(perf.chiffreAffairesBrut)}</TableCell>
                      <TableCell>{formatFCFA(perf.commissionColimoTotal)}</TableCell>
                      <TableCell>{formatFCFA(perf.revenusNetCoursier)}</TableCell>
                      <TableCell className="text-colimo-neutre-fonce/70">
                        {prochainPalier && coursesRestantes !== null
                          ? `${coursesRestantes} avant ${prochainPalier.nom}`
                          : "Meilleur taux atteint"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {performancesCommissionFiltrees.length === 0 && (
                  <TableRow className="border-colimo-neutre-clair">
                    <TableCell colSpan={8} className="py-8 text-center text-colimo-neutre-fonce/50">
                      Aucune donnée pour ce mois et ces filtres.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <GrillePaliersCommission paliers={paliersCommission} onEnregistre={chargerCommissions} />
          </div>
        </div>
      )}

      {section === "historique" && (
        <div>
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Coursier</label>
              <Select value={filtreHistoriqueCoursier} onValueChange={setFiltreHistoriqueCoursier}>
                <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les coursiers</SelectItem>
                  {coursiersVisibles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {nomCoursier(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-colimo-neutre-fonce/60">Action</label>
              <Select
                value={filtreHistoriqueAction}
                onValueChange={(v) => setFiltreHistoriqueAction(v as ActionHistoriqueCoursier | "toutes")}
              >
                <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toutes">Toutes les actions</SelectItem>
                  {Object.entries(ACTION_HISTORIQUE_COURSIER_LABELS).map(([action, label]) => (
                    <SelectItem key={action} value={action}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                  <TableHead>Date</TableHead>
                  <TableHead>Coursier</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Détail</TableHead>
                  <TableHead>Motif / commentaire</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historiqueFiltre.map((h) => {
                  const coursier = coursiers.find((c) => c.id === h.coursierId);
                  return (
                    <TableRow key={h.id} className="border-colimo-neutre-clair">
                      <TableCell className="text-xs text-colimo-neutre-fonce/50">{new Date(h.createdAt).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>{coursier ? nomCoursier(coursier) : "—"}</TableCell>
                      <TableCell>{ACTION_HISTORIQUE_COURSIER_LABELS[h.action]}</TableCell>
                      <TableCell className="text-xs text-colimo-neutre-fonce/70">
                        {h.ancienneValeur && <span>{h.ancienneValeur} → </span>}
                        {h.nouvelleValeur ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-colimo-neutre-fonce/70">
                        {h.motif && <p>Motif : {h.motif}</p>}
                        {h.commentaire && <p>{h.commentaire}</p>}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!chargement && historiqueFiltre.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-colimo-neutre-fonce/50">
                      Aucune entrée pour ce filtre
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {section === "parametres" && (
        <ParametresCoursiers niveaux={niveaux} badges={badges} onEnregistre={chargerTout} />
      )}

      <Dialog
        open={coursierARejeter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoursierARejeter(null);
            setMotifRejet("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter ce dossier</DialogTitle>
          </DialogHeader>
          <Input value={motifRejet} onChange={(e) => setMotifRejet(e.target.value)} placeholder="Motif du rejet (optionnel)" autoFocus />
          <DialogFooter>
            <button
              onClick={() => setCoursierARejeter(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerRejet}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Rejeter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={coursierASuspendre !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoursierASuspendre(null);
            setMotifSuspension("");
            setCommentaireSuspension("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre {coursierASuspendre && nomCoursier(coursierASuspendre)}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-colimo-neutre-fonce/60">
            Ex. mauvais comportement, documents expirés, litiges élevés, fraude, demande personnelle
          </p>
          <Input
            value={motifSuspension}
            onChange={(e) => setMotifSuspension(e.target.value)}
            placeholder="Motif (obligatoire)"
            autoFocus
          />
          <Input
            value={commentaireSuspension}
            onChange={(e) => setCommentaireSuspension(e.target.value)}
            placeholder="Commentaire interne (optionnel)"
          />
          <DialogFooter>
            <button
              onClick={() => setCoursierASuspendre(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerSuspension}
              disabled={!motifSuspension.trim()}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
            >
              Suspendre
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={coursierADesactiver !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoursierADesactiver(null);
            setMotifDesactivation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Désactiver définitivement {coursierADesactiver && nomCoursier(coursierADesactiver)} ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-colimo-neutre-fonce/70">Cette action ferme le compte.</p>
          <Input
            value={motifDesactivation}
            onChange={(e) => setMotifDesactivation(e.target.value)}
            placeholder="Motif de la désactivation (optionnel)"
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => setCoursierADesactiver(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerDesactivation}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Désactiver
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={coursierASupprimer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCoursierASupprimer(null);
            setMotifSuppressionCoursier("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement ce coursier ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-colimo-neutre-fonce/70">
            {coursierASupprimer && nomCoursier(coursierASupprimer)} — si ce compte n&apos;a aucun historique (aucune
            course, aucun avis...), il sera supprimé définitivement, y compris de Supabase Auth. S&apos;il a de
            l&apos;historique, ses données personnelles seront anonymisées et sa connexion bloquée définitivement —
            mais son historique de courses/paiements sera conservé. Cette action est irréversible.
          </p>
          <Input
            value={motifSuppressionCoursier}
            onChange={(e) => setMotifSuppressionCoursier(e.target.value)}
            placeholder="Motif de la suppression (optionnel)"
          />
          <DialogFooter>
            <button
              onClick={() => setCoursierASupprimer(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerSuppressionCoursier}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Supprimer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

interface BrouillonPalier {
  code: string;
  nom: string;
  seuilMin: string;
  seuilMax: string;
  taux: string;
  ordre: number;
}

function palierVersBrouillon(p: PalierCommission): BrouillonPalier {
  return {
    code: p.code,
    nom: p.nom,
    seuilMin: String(p.seuilMin),
    seuilMax: p.seuilMax === null ? "" : String(p.seuilMax),
    taux: String(Math.round(p.taux * 100)),
    ordre: p.ordre,
  };
}

// Grille des paliers de commission (besoin section 9) — même patron de
// brouillon éditable que ParametresCoursiers ci-dessus, mais enregistrée en
// un seul appel (enregistrer_grille_paliers_commission valide l'ensemble de
// la grille, pas ligne par ligne : chevauchement/trous ne peuvent être
// détectés qu'en comparant toutes les lignes entre elles). Une date d'effet
// différente de celle déjà active crée une nouvelle version de la grille,
// sans jamais modifier les commissions déjà calculées avec l'ancienne.
function GrillePaliersCommission({ paliers, onEnregistre }: { paliers: PalierCommission[]; onEnregistre: () => Promise<void> }) {
  const dateEffetActuelle = paliers[0]?.dateEffet ?? new Date().toISOString().slice(0, 10);
  const [dateEffet, setDateEffet] = useState(dateEffetActuelle);
  const [brouillons, setBrouillons] = useState<BrouillonPalier[]>(() => paliers.map(palierVersBrouillon));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    setDateEffet(dateEffetActuelle);
    setBrouillons(paliers.map(palierVersBrouillon));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paliers]);

  function modifier(index: number, champ: "nom" | "seuilMin" | "seuilMax" | "taux", valeur: string) {
    setBrouillons((prev) => prev.map((b, i) => (i === index ? { ...b, [champ]: valeur } : b)));
  }

  async function enregistrer() {
    setEnCours(true);
    setErreur(null);
    try {
      const entrees: EntreeGrillePalier[] = brouillons.map((b) => ({
        code: b.code,
        nom: b.nom,
        seuilMin: Number(b.seuilMin) || 0,
        seuilMax: b.seuilMax.trim() === "" ? null : Number(b.seuilMax),
        taux: (Number(b.taux) || 0) / 100,
        ordre: b.ordre,
      }));
      await enregistrerGrillePaliersCommission(dateEffet, entrees);
      await onEnregistre();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'enregistrer cette grille.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-medium text-colimo-neutre-fonce">Grille des paliers</p>
          <p className="mt-1 text-xs text-colimo-neutre-fonce/60">
            Une modification ne s&apos;applique qu&apos;aux commissions calculées à partir de la date d&apos;effet —
            jamais aux commissions déjà enregistrées.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-colimo-neutre-fonce/60">Date d&apos;effet</label>
          <input
            type="date"
            value={dateEffet}
            onChange={(e) => setDateEffet(e.target.value)}
            className="h-auto rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm text-colimo-neutre-fonce"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {brouillons.map((b, index) => (
          <div key={b.code} className="flex flex-wrap items-center gap-3 rounded-lg border border-colimo-neutre-clair p-3">
            <input
              value={b.nom}
              onChange={(e) => modifier(index, "nom", e.target.value)}
              className="w-28 rounded-lg border border-colimo-neutre-clair px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-colimo-neutre-fonce/60">
              Min
              <input
                type="number"
                value={b.seuilMin}
                onChange={(e) => modifier(index, "seuilMin", e.target.value)}
                className="w-16 rounded-lg border border-colimo-neutre-clair px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-colimo-neutre-fonce/60">
              Max
              <input
                type="number"
                placeholder="∞"
                value={b.seuilMax}
                onChange={(e) => modifier(index, "seuilMax", e.target.value)}
                className="w-16 rounded-lg border border-colimo-neutre-clair px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-colimo-neutre-fonce/60">
              Taux %
              <input
                type="number"
                value={b.taux}
                onChange={(e) => modifier(index, "taux", e.target.value)}
                className="w-16 rounded-lg border border-colimo-neutre-clair px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        ))}
      </div>

      {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}

      <button
        onClick={enregistrer}
        disabled={enCours || brouillons.length === 0}
        className="mt-4 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
      >
        {enCours ? "Enregistrement…" : "Enregistrer la grille"}
      </button>
    </div>
  );
}
