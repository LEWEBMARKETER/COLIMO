"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  supprimerCompteUtilisateur,
  suspendreCoursier,
} from "@/lib/api";
import {
  ACTION_HISTORIQUE_COURSIER_LABELS,
  PIECE_IDENTITE_LABELS,
  STATUT_COURSIER_LABELS,
  ZONE_LABELS,
  calculerStatistiquesCoursier,
  calculerStatutEffectif,
  estCompteSupprime,
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
  const [dialogStatutOuvert, setDialogStatutOuvert] = useState(false);
  const [motifChangementStatut, setMotifChangementStatut] = useState("");
  const [dialogSuspensionOuvert, setDialogSuspensionOuvert] = useState(false);
  const [motifSuspension, setMotifSuspension] = useState("");
  const [dialogSuppressionOuvert, setDialogSuppressionOuvert] = useState(false);
  const [motifSuppression, setMotifSuppression] = useState("");

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

  async function appliquerChangementStatut(motif?: string) {
    if (!coursier) return;
    if (aCourseEnCours && ["suspendu", "desactive"].includes(nouveauStatut)) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le suspendre/désactiver.");
      return;
    }
    try {
      await changerStatutCoursier(coursier.id, nouveauStatut, { ancienStatut: coursier.statut, motif });
      await charger();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de modifier le statut.");
    }
  }

  function cliquerModifierStatut() {
    if (["suspendu", "desactive"].includes(nouveauStatut)) {
      setMotifChangementStatut("");
      setDialogStatutOuvert(true);
    } else {
      appliquerChangementStatut();
    }
  }

  async function confirmerChangementStatut() {
    await appliquerChangementStatut(motifChangementStatut.trim() || undefined);
    setDialogStatutOuvert(false);
  }

  function ouvrirSuspension() {
    if (aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le suspendre.");
      return;
    }
    setMotifSuspension("");
    setDialogSuspensionOuvert(true);
  }

  async function confirmerSuspension() {
    if (!coursier || !motifSuspension.trim()) return;
    try {
      await suspendreCoursier(coursier.id, { motif: motifSuspension.trim() });
      await charger();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de suspendre ce coursier.");
    } finally {
      setDialogSuspensionOuvert(false);
      setMotifSuspension("");
    }
  }

  async function reactiver() {
    if (!coursier) return;
    try {
      await reactiverCoursier(coursier.id);
      await charger();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de réactiver ce coursier.");
    }
  }

  async function desactiver() {
    if (!coursier) return;
    if (aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le désactiver.");
      return;
    }
    try {
      await desactiverCoursier(coursier.id);
      await charger();
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de désactiver ce coursier.");
    }
  }

  function ouvrirSuppression() {
    if (aCourseEnCours) {
      window.alert("Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de le supprimer.");
      return;
    }
    setMotifSuppression("");
    setDialogSuppressionOuvert(true);
  }

  async function confirmerSuppression() {
    if (!coursier) return;
    try {
      const resultat = await supprimerCompteUtilisateur(coursier.utilisateurId, motifSuppression.trim() || undefined);
      window.alert(
        resultat.mode === "suppression_definitive"
          ? "Compte supprimé définitivement."
          : "Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement (l'historique de courses/paiements est conservé)."
      );
      router.push("/coursiers");
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de supprimer ce compte.");
      setDialogSuppressionOuvert(false);
    }
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
  // Un compte supprimé (anonymisé) n'a plus rien à modifier — son identité,
  // ses documents et sa disponibilité ont déjà été effacés côté serveur ;
  // seuls les stats/historique restent affichés à titre d'audit.
  const estSupprime = estCompteSupprime(coursier.utilisateur.telephone);

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
        {!estSupprime && (
          <button
            onClick={recalculer}
            className="shrink-0 rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
          >
            Recalculer badges/niveau
          </button>
        )}
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

      {estSupprime && (
        <div className="mt-8 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="font-medium text-colimo-neutre-fonce">🗑️ Compte supprimé</p>
          <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
            Ce compte a été supprimé depuis le back-office. Ses données personnelles (nom, téléphone, documents) ont
            été anonymisées et sa connexion bloquée définitivement — aucune action supplémentaire n&apos;est possible.
            Son historique de courses, paiements et évaluations reste conservé ci-dessous, et il pourra recréer un
            nouveau compte 24h après la suppression.
          </p>
        </div>
      )}

      {!estSupprime && (
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Statut</p>
          {aCourseEnCours && (
            <p className="mb-3 rounded-lg bg-colimo-rouge-clair px-3 py-2 text-xs text-colimo-rouge">
              ⚠️ Ce coursier a une course active en cours — réaffectez-la ou attendez sa finalisation avant de suspendre, désactiver ou
              supprimer ce compte.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={nouveauStatut} onValueChange={(v) => setNouveauStatut(v as StatutCoursier)}>
              <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_MODIFIABLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_COURSIER_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={cliquerModifierStatut}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              ✏️ Modifier le statut
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {coursier.statut === "suspendu" || coursier.statut === "desactive" ? (
              <button
                onClick={reactiver}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
              >
                ♻️ Réactiver
              </button>
            ) : (
              <button
                onClick={ouvrirSuspension}
                disabled={aCourseEnCours}
                title={aCourseEnCours ? "Course active en cours — réaffectez-la avant de suspendre" : undefined}
                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:cursor-not-allowed disabled:opacity-40"
              >
                ⏸️ Suspendre
              </button>
            )}
            {coursier.statut !== "desactive" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={aCourseEnCours}
                    title={aCourseEnCours ? "Course active en cours — réaffectez-la avant de désactiver" : undefined}
                    className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🚫 Désactiver
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Désactiver définitivement ce compte ?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={desactiver}>Désactiver</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <button
              onClick={ouvrirSuppression}
              disabled={aCourseEnCours}
              title={aCourseEnCours ? "Course active en cours — réaffectez-la avant de supprimer" : undefined}
              className="rounded-md border border-colimo-rouge/30 px-3 py-1.5 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:cursor-not-allowed disabled:opacity-40"
            >
              🗑️ Supprimer définitivement
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Niveau</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={niveauSelectionne || "aucun"} onValueChange={(v) => setNiveauSelectionne(v === "aucun" ? "" : v)}>
              <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Aucun</SelectItem>
                {niveaux.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={enregistrerNiveau}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              ✏️ Modifier le niveau
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <p className="mb-3 font-medium text-colimo-neutre-fonce">Attribuer un badge</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={badgeAAttribuer || "aucun"} onValueChange={(v) => setBadgeAAttribuer(v === "aucun" ? "" : v)}>
              <SelectTrigger className="h-auto w-auto min-w-[10rem] rounded-lg border-colimo-neutre-clair py-2 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Choisir un badge</SelectItem>
                {badgesDisponibles.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.icone} {b.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      )}

      <div className="mt-8">
        <p className="mb-3 font-titre text-base font-semibold text-colimo-neutre-fonce">Historique</p>
        <div className="overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détail</TableHead>
                <TableHead>Motif / commentaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historique.map((h) => (
                <TableRow key={h.id} className="border-colimo-neutre-clair">
                  <TableCell className="text-xs text-colimo-neutre-fonce/50">{new Date(h.createdAt).toLocaleString("fr-FR")}</TableCell>
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
              ))}
              {historique.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-colimo-neutre-fonce/50">
                    Aucun historique
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogStatutOuvert} onOpenChange={setDialogStatutOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut en « {STATUT_COURSIER_LABELS[nouveauStatut]} »</DialogTitle>
          </DialogHeader>
          <Input
            value={motifChangementStatut}
            onChange={(e) => setMotifChangementStatut(e.target.value)}
            placeholder="Motif (optionnel)"
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => setDialogStatutOuvert(false)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerChangementStatut}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogSuspensionOuvert} onOpenChange={setDialogSuspensionOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre {nom}</DialogTitle>
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
          <DialogFooter>
            <button
              onClick={() => setDialogSuspensionOuvert(false)}
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

      <Dialog open={dialogSuppressionOuvert} onOpenChange={setDialogSuppressionOuvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement ce coursier ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-colimo-neutre-fonce/70">
            Cette action est irréversible. Si ce compte n&apos;a aucun historique (aucune course, aucun avis...), il
            sera supprimé définitivement, y compris de Supabase Auth. S&apos;il a de l&apos;historique, ses données
            personnelles seront anonymisées et sa connexion bloquée définitivement — mais son historique de
            courses/paiements sera conservé.
          </p>
          <Input
            value={motifSuppression}
            onChange={(e) => setMotifSuppression(e.target.value)}
            placeholder="Motif de la suppression (optionnel)"
          />
          <DialogFooter>
            <button
              onClick={() => setDialogSuppressionOuvert(false)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerSuppression}
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
