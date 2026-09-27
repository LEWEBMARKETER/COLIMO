"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatutBadge from "@/components/StatutBadge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getConfigurationPaiementAutomatique,
  getCourses,
  getPaiements,
  getUtilisateurs,
  getWebhooksPaiement,
  patchConfigurationPaiementAutomatique,
  rejeterPaiement,
  validerPaiement,
} from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  RESEAU_PAIEMENT_LABELS,
  STATUT_PAIEMENT_LABELS,
  estUrlHttpSure,
  formatFCFA,
  type ConfigurationPaiementAutomatique,
  type Course,
  type Paiement,
  type PaymentOperator,
  type Utilisateur,
  type WebhookPaiement,
} from "@colimo/shared";

const ONGLETS = ["a_valider", "historique"] as const;
type Onglet = (typeof ONGLETS)[number];

const ONGLET_LABELS: Record<Onglet, string> = {
  a_valider: "Paiements à valider",
  historique: "Historique",
};

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [onglet, setOnglet] = useState<Onglet>("a_valider");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [configAuto, setConfigAuto] = useState<ConfigurationPaiementAutomatique | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookPaiement[]>([]);
  const [configEnCours, setConfigEnCours] = useState(false);
  const [afficherWebhooks, setAfficherWebhooks] = useState(false);
  const [paiementARejeter, setPaiementARejeter] = useState<Paiement | null>(null);
  const [motifRejet, setMotifRejet] = useState("");

  useEffect(() => {
    Promise.all([getPaiements(), getCourses(), getUtilisateurs(), getConfigurationPaiementAutomatique()])
      .then(([p, c, u, cfg]) => {
        setPaiements(p);
        setCourses(c);
        setUtilisateurs(u);
        setConfigAuto(cfg);
      })
      .finally(() => setChargement(false));
  }, []);

  async function basculerPaiementAutomatique(actif: boolean) {
    setConfigEnCours(true);
    try {
      setConfigAuto(await patchConfigurationPaiementAutomatique({ actif }));
    } finally {
      setConfigEnCours(false);
    }
  }

  async function changerFournisseur(fournisseur: PaymentOperator | "") {
    setConfigEnCours(true);
    try {
      setConfigAuto(await patchConfigurationPaiementAutomatique({ fournisseur: fournisseur || null }));
    } finally {
      setConfigEnCours(false);
    }
  }

  async function afficherJournalWebhooks() {
    if (!afficherWebhooks) setWebhooks(await getWebhooksPaiement(20));
    setAfficherWebhooks((v) => !v);
  }

  const course = useMemo(() => (id: string) => courses.find((c) => c.id === id), [courses]);
  const utilisateur = useMemo(() => (id: string) => utilisateurs.find((u) => u.id === id), [utilisateurs]);

  const paiementsAffiches = useMemo(
    () => (onglet === "a_valider" ? paiements.filter((p) => p.statut === "en_attente_validation") : paiements),
    [paiements, onglet]
  );

  const enAttenteValidation = paiements.filter((p) => p.statut === "en_attente_validation");
  const montantEnAttente = enAttenteValidation.reduce((total, p) => total + (p.montantPaye ?? p.montantAttendu), 0);
  const confirmesCeMois = paiements.filter((p) => {
    if (p.statut !== "paiement_confirme" || !p.valideAt) return false;
    const d = new Date(p.valideAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  async function valider(paiement: Paiement) {
    setEnCours(paiement.id);
    try {
      const misAJour = await validerPaiement(paiement.id);
      setPaiements((prev) => prev.map((p) => (p.id === paiement.id ? misAJour : p)));
      const client = utilisateur(paiement.utilisateurId);
      await notifierEvenement("paiement_confirme", {
        destinataire: client?.telephone,
        utilisateurId: paiement.utilisateurId,
        variables: { nom_client: client?.prenom ?? client?.nom ?? "client", reference: paiement.reference },
      });
    } finally {
      setEnCours(null);
    }
  }

  async function rejeter(paiement: Paiement, motif: string) {
    setEnCours(paiement.id);
    try {
      const misAJour = await rejeterPaiement(paiement.id, motif || undefined);
      setPaiements((prev) => prev.map((p) => (p.id === paiement.id ? misAJour : p)));
      const client = utilisateur(paiement.utilisateurId);
      await notifierEvenement("paiement_rejete", {
        destinataire: client?.telephone,
        utilisateurId: paiement.utilisateurId,
        variables: { nom_client: client?.prenom ?? client?.nom ?? "client", reference: paiement.reference },
      });
    } finally {
      setEnCours(null);
      setPaiementARejeter(null);
      setMotifRejet("");
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Paiements</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Paiement manuel Airtel Money — vérification et validation des frais de livraison déclarés par les
        clients et commerçants.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="À valider" value={String(enAttenteValidation.length)} sombre />
        <StatCard label="Montant en attente" value={formatFCFA(montantEnAttente)} />
        <StatCard label="Confirmés ce mois-ci" value={String(confirmesCeMois)} />
      </div>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-texte-medium text-sm font-semibold text-colimo-neutre-fonce">Paiement automatique</h2>
            <p className="mt-1 text-xs text-colimo-neutre-fonce/60">
              Désactivé : le flux manuel ci-dessous (déclaration + validation) reste seul actif. À n&apos;activer
              qu&apos;une fois un fournisseur (Airtel Money/Moov Money) réellement configuré côté serveur
              (variables d&apos;environnement Vercel) — cf. docs/PAIEMENT_AUTOMATIQUE.md.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm font-medium text-colimo-neutre-fonce">
            <input
              type="checkbox"
              checked={configAuto?.actif ?? false}
              disabled={configEnCours || !configAuto}
              onChange={(e) => basculerPaiementAutomatique(e.target.checked)}
            />
            Actif
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center text-xs font-medium text-colimo-neutre-fonce/70">
            Fournisseur
            <Select
              value={configAuto?.fournisseur ?? "aucun"}
              disabled={configEnCours || !configAuto}
              onValueChange={(v) => changerFournisseur(v === "aucun" ? "" : (v as PaymentOperator))}
            >
              <SelectTrigger className="ml-2 h-auto w-auto rounded-lg border-colimo-neutre-clair px-2 py-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">— Non configuré —</SelectItem>
                <SelectItem value="airtel_money">Airtel Money</SelectItem>
                <SelectItem value="moov_money">Moov Money</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <button
            onClick={afficherJournalWebhooks}
            className="rounded-lg border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
          >
            {afficherWebhooks ? "Masquer" : "Voir"} le journal des webhooks
          </button>
        </div>

        {afficherWebhooks && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-colimo-neutre-clair">
            {webhooks.length === 0 ? (
              <p className="p-3 text-xs text-colimo-neutre-fonce/50">Aucun webhook reçu pour l&apos;instant.</p>
            ) : (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-colimo-neutre-clair bg-colimo-neutre-clair/40 text-colimo-neutre-fonce/60">
                    <TableHead className="h-8 px-3 py-2">Date</TableHead>
                    <TableHead className="h-8 px-3 py-2">Fournisseur</TableHead>
                    <TableHead className="h-8 px-3 py-2">Traité</TableHead>
                    <TableHead className="h-8 px-3 py-2">Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((w) => (
                    <TableRow key={w.id} className="border-colimo-neutre-clair">
                      <TableCell className="p-2 px-3">{new Date(w.createdAt).toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="p-2 px-3">{w.fournisseur}</TableCell>
                      <TableCell className="p-2 px-3">{w.traite ? "✓" : "—"}</TableCell>
                      <TableCell className="p-2 px-3 text-colimo-rouge">{w.erreur ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2 border-b border-colimo-neutre-clair">
        {ONGLETS.map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              onglet === o
                ? "border-colimo-rouge text-colimo-rouge"
                : "border-transparent text-colimo-neutre-fonce/60 hover:text-colimo-neutre-fonce"
            }`}
          >
            {ONGLET_LABELS[o]}
            {o === "a_valider" && enAttenteValidation.length > 0 && (
              <span className="ml-1.5 rounded-full bg-colimo-rouge px-1.5 py-0.5 text-[10px] text-white">
                {enAttenteValidation.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>N° commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Réseau</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Capture</TableHead>
              <TableHead>Déclaré le</TableHead>
              <TableHead>Statut</TableHead>
              {onglet === "a_valider" && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paiementsAffiches.map((paiement) => {
              const c = course(paiement.courseId);
              const client = utilisateur(paiement.utilisateurId);
              return (
                <TableRow key={paiement.id} className="border-colimo-neutre-clair">
                  <TableCell className="font-mono text-xs text-colimo-neutre-fonce/70">
                    {c?.numeroCommande ?? "—"}
                  </TableCell>
                  <TableCell>
                    {client?.prenom ? `${client.prenom} ` : ""}
                    {client?.nom ?? "—"}
                  </TableCell>
                  <TableCell>{paiement.numeroPayeur ?? client?.telephone ?? "—"}</TableCell>
                  <TableCell>
                    {formatFCFA(paiement.montantPaye ?? paiement.montantAttendu)}
                    {paiement.montantPaye !== null && paiement.montantPaye !== paiement.montantAttendu && (
                      <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                        Attendu : {formatFCFA(paiement.montantAttendu)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{paiement.reseau ? RESEAU_PAIEMENT_LABELS[paiement.reseau] : "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-colimo-neutre-fonce/70">
                    {paiement.reference}
                    {paiement.referenceTransaction && (
                      <p className="mt-0.5 text-colimo-neutre-fonce/50">Txn : {paiement.referenceTransaction}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {paiement.captureUrl && estUrlHttpSure(paiement.captureUrl) ? (
                      <a
                        href={paiement.captureUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-colimo-rouge hover:underline"
                      >
                        Voir
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-colimo-neutre-fonce/50">
                    {paiement.declareAt ? new Date(paiement.declareAt).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatutBadge statut={paiement.statut} label={STATUT_PAIEMENT_LABELS[paiement.statut]} />
                  </TableCell>
                  {onglet === "a_valider" && (
                    <TableCell>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              disabled={enCours === paiement.id}
                              className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
                            >
                              Valider
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer ce paiement ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Confirmer le paiement {paiement.reference} ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => valider(paiement)}>Confirmer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Dialog
                          open={paiementARejeter?.id === paiement.id}
                          onOpenChange={(open) => {
                            setPaiementARejeter(open ? paiement : null);
                            setMotifRejet("");
                          }}
                        >
                          <DialogTrigger asChild>
                            <button
                              disabled={enCours === paiement.id}
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                            >
                              Rejeter
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Rejeter le paiement {paiement.reference}</DialogTitle>
                            </DialogHeader>
                            <Input
                              value={motifRejet}
                              onChange={(e) => setMotifRejet(e.target.value)}
                              placeholder="Motif (optionnel)"
                              autoFocus
                            />
                            <DialogFooter>
                              <button
                                onClick={() => setPaiementARejeter(null)}
                                className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => rejeter(paiement, motifRejet)}
                                className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
                              >
                                Rejeter
                              </button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!chargement && paiementsAffiches.length === 0 && (
              <TableRow>
                <TableCell colSpan={onglet === "a_valider" ? 10 : 9} className="py-6 text-center text-colimo-neutre-fonce/50">
                  {onglet === "a_valider" ? "Aucun paiement à valider" : "Aucun paiement"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
