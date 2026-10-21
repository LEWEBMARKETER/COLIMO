"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatutBadge from "@/components/StatutBadge";
import {
  definirModuleTransportActif,
  demanderCorrectionDossierTransporteur,
  demanderCorrectionVehiculeTransporteur,
  getConfigurationModuleTransport,
  getHistoriqueTransporteur,
  getTransporteurs,
  getUtilisateurs,
  getVehiculesTransporteur,
  rejeterDossierTransporteur,
  rejeterVehiculeTransporteur,
  validerDossierTransporteur,
  validerVehiculeTransporteur,
} from "@/lib/api";
import {
  ACTION_HISTORIQUE_TRANSPORTEUR_LABELS,
  STATUT_VERIFICATION_TRANSPORT_LABELS,
  TYPE_VEHICULE_TRANSPORT_LABELS,
  ZONE_LABELS,
  type ConfigurationModuleTransport,
  type HistoriqueTransporteur,
  type Transporteur,
  type Utilisateur,
  type VehiculeTransporteur,
  type VerificationStatus,
} from "@colimo/shared";

// Couleurs déjà définies dans StatutBadge pour en_attente/valide/rejete —
// on réutilise le même composant, seul le libellé affiché change
// (EN_ATTENTE/CONFIRME/NON_CONFIRME), l'enum verification_status sous-jacent
// restant partagé avec coursiers et jamais renommé.

type ActionDossier =
  | { type: "rejeter"; transporteurId: string }
  | { type: "corriger"; transporteurId: string }
  | { type: "rejeter_vehicule"; transporteurId: string; vehiculeId: string }
  | { type: "corriger_vehicule"; transporteurId: string; vehiculeId: string };

export default function TransporteursPage() {
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [vehiculesParTransporteur, setVehiculesParTransporteur] = useState<Map<string, VehiculeTransporteur[]>>(new Map());
  const [config, setConfig] = useState<ConfigurationModuleTransport | null>(null);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState<ActionDossier | null>(null);
  const [motifAction, setMotifAction] = useState("");
  const [detailTransporteurId, setDetailTransporteurId] = useState<string | null>(null);
  const [historiqueDetail, setHistoriqueDetail] = useState<HistoriqueTransporteur[]>([]);

  async function chargerTout() {
    const [t, u, c] = await Promise.all([getTransporteurs(), getUtilisateurs(), getConfigurationModuleTransport()]);
    setTransporteurs(t);
    setUtilisateurs(u);
    setConfig(c);
    const vehiculesEntries = await Promise.all(
      t.map(async (transporteur) => [transporteur.id, await getVehiculesTransporteur(transporteur.id)] as const)
    );
    setVehiculesParTransporteur(new Map(vehiculesEntries));
    setChargement(false);
  }

  useEffect(() => {
    chargerTout();
  }, []);

  const utilisateurParId = useMemo(() => new Map(utilisateurs.map((u) => [u.id, u])), [utilisateurs]);

  function nomTransporteur(t: Transporteur): string {
    const u = utilisateurParId.get(t.utilisateurId);
    const nomPersonne = u?.prenom ? `${u.prenom} ${u.nom}` : u?.nom ?? "—";
    return t.nomEntreprise ? `${t.nomEntreprise} (${nomPersonne})` : nomPersonne;
  }

  function resumeVehicule(t: Transporteur): string {
    const vehicules = vehiculesParTransporteur.get(t.id) ?? [];
    const premierVehicule = vehicules[0];
    if (!premierVehicule) return "Aucun véhicule";
    const premier = `${TYPE_VEHICULE_TRANSPORT_LABELS[premierVehicule.typeVehicule]} (${premierVehicule.plaqueImmatriculation})`;
    return vehicules.length > 1 ? `${premier} +${vehicules.length - 1}` : premier;
  }

  async function basculerModule() {
    if (!config) return;
    await definirModuleTransportActif(!config.actif);
    await chargerTout();
  }

  async function valider(transporteurId: string) {
    await validerDossierTransporteur(transporteurId);
    await chargerTout();
  }

  async function validerVehicule(vehiculeId: string) {
    await validerVehiculeTransporteur(vehiculeId);
    await chargerTout();
  }

  async function ouvrirDetail(transporteurId: string) {
    setDetailTransporteurId(transporteurId);
    setHistoriqueDetail(await getHistoriqueTransporteur(transporteurId));
  }

  async function confirmerAction() {
    if (!actionEnCours || !motifAction.trim()) return;
    if (actionEnCours.type === "rejeter") {
      await rejeterDossierTransporteur(actionEnCours.transporteurId, motifAction.trim());
    } else if (actionEnCours.type === "corriger") {
      await demanderCorrectionDossierTransporteur(actionEnCours.transporteurId, motifAction.trim());
    } else if (actionEnCours.type === "rejeter_vehicule") {
      await rejeterVehiculeTransporteur(actionEnCours.vehiculeId, actionEnCours.transporteurId, motifAction.trim());
    } else {
      await demanderCorrectionVehiculeTransporteur(actionEnCours.vehiculeId, actionEnCours.transporteurId, motifAction.trim());
    }
    setActionEnCours(null);
    setMotifAction("");
    await chargerTout();
  }

  const transporteurDetail = transporteurs.find((t) => t.id === detailTransporteurId) ?? null;
  const vehiculesDetail = detailTransporteurId ? vehiculesParTransporteur.get(detailTransporteurId) ?? [] : [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-colimo-neutre-fonce">Transporteurs</h1>
        {config && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-colimo-neutre-fonce/60">
              Module COLIMO TRANSPORT : <strong>{config.actif ? "actif" : "inactif"}</strong>
            </span>
            <button
              onClick={basculerModule}
              className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                config.actif ? "bg-gray-500 hover:bg-gray-600" : "bg-colimo-rouge hover:bg-colimo-rouge-fonce"
              }`}
            >
              {config.actif ? "Désactiver" : "Activer"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Véhicule</TableHead>
              <TableHead>Commune</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transporteurs.map((t) => (
              <TableRow key={t.id} className="border-colimo-neutre-clair align-top">
                <TableCell className="font-medium text-colimo-neutre-fonce">{nomTransporteur(t)}</TableCell>
                <TableCell>{utilisateurParId.get(t.utilisateurId)?.telephone}</TableCell>
                <TableCell>{resumeVehicule(t)}</TableCell>
                <TableCell>{t.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"}</TableCell>
                <TableCell>
                  <StatutBadge statut={t.statutVerification} label={STATUT_VERIFICATION_TRANSPORT_LABELS[t.statutVerification]} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => ouvrirDetail(t.id)}
                      className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                    >
                      👁️ Consulter
                    </button>
                    {t.statutVerification === "en_attente" && (
                      <>
                        <button
                          onClick={() => valider(t.id)}
                          className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => {
                            setActionEnCours({ type: "rejeter", transporteurId: t.id });
                            setMotifAction("");
                          }}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Ne pas confirmer
                        </button>
                        <button
                          onClick={() => {
                            setActionEnCours({ type: "corriger", transporteurId: t.id });
                            setMotifAction("");
                          }}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Demander une correction
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!chargement && transporteurs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun transporteur inscrit
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Détail + documents (actions "Consulter" et "Consulter les documents"
          ouvrent la même vue, pour rester simple) */}
      <Dialog open={transporteurDetail !== null} onOpenChange={(open) => !open && setDetailTransporteurId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {transporteurDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{nomTransporteur(transporteurDetail)}</DialogTitle>
              </DialogHeader>

              <div className="space-y-1 text-sm text-colimo-neutre-fonce">
                <p>Téléphone : {utilisateurParId.get(transporteurDetail.utilisateurId)?.telephone}</p>
                <p>Commune : {transporteurDetail.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"}</p>
                <p>Quartier : {transporteurDetail.quartier || "—"}</p>
                <p>
                  Conditions de partenariat acceptées :{" "}
                  {transporteurDetail.conditionsPartenariatAccepteesAt ? "Oui" : "Non"}
                </p>
              </div>

              <h3 className="mt-4 text-sm font-semibold text-colimo-neutre-fonce">Documents</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {transporteurDetail.pieceIdentiteUrl && (
                  <a href={transporteurDetail.pieceIdentiteUrl} target="_blank" rel="noreferrer" className="text-colimo-rouge underline">
                    Pièce d&apos;identité
                  </a>
                )}
                {transporteurDetail.permisConduireUrl && (
                  <a href={transporteurDetail.permisConduireUrl} target="_blank" rel="noreferrer" className="text-colimo-rouge underline">
                    Permis de conduire
                  </a>
                )}
                {!transporteurDetail.pieceIdentiteUrl && !transporteurDetail.permisConduireUrl && (
                  <span className="text-colimo-neutre-fonce/40">Aucun document transmis</span>
                )}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-colimo-neutre-fonce">Véhicules</h3>
              {vehiculesDetail.length === 0 ? (
                <p className="text-sm text-colimo-neutre-fonce/40">Aucun véhicule</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {vehiculesDetail.map((v) => (
                    <div key={v.id} className="rounded-xl border border-colimo-neutre-clair p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-colimo-neutre-fonce">
                          {TYPE_VEHICULE_TRANSPORT_LABELS[v.typeVehicule]} — {v.plaqueImmatriculation}
                        </span>
                        <StatutBadge statut={v.statutVerification} label={STATUT_VERIFICATION_TRANSPORT_LABELS[v.statutVerification]} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        {v.photoUrl && (
                          <a href={v.photoUrl} target="_blank" rel="noreferrer" className="text-colimo-rouge underline">
                            Photo
                          </a>
                        )}
                        {v.carteGriseUrl && (
                          <a href={v.carteGriseUrl} target="_blank" rel="noreferrer" className="text-colimo-rouge underline">
                            Carte grise
                          </a>
                        )}
                        {v.assuranceUrl && (
                          <a href={v.assuranceUrl} target="_blank" rel="noreferrer" className="text-colimo-rouge underline">
                            Assurance
                          </a>
                        )}
                      </div>
                      {v.statutVerification === "en_attente" && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            onClick={() => validerVehicule(v.id)}
                            className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                          >
                            Confirmer
                          </button>
                          <button
                            onClick={() => {
                              setActionEnCours({ type: "rejeter_vehicule", transporteurId: transporteurDetail.id, vehiculeId: v.id });
                              setMotifAction("");
                            }}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                          >
                            Ne pas confirmer
                          </button>
                          <button
                            onClick={() => {
                              setActionEnCours({ type: "corriger_vehicule", transporteurId: transporteurDetail.id, vehiculeId: v.id });
                              setMotifAction("");
                            }}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                          >
                            Demander une correction
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h3 className="mt-4 text-sm font-semibold text-colimo-neutre-fonce">Journal des décisions</h3>
              {historiqueDetail.length === 0 ? (
                <p className="text-sm text-colimo-neutre-fonce/40">Aucune décision enregistrée</p>
              ) : (
                <ul className="space-y-1 text-sm text-colimo-neutre-fonce/70">
                  {historiqueDetail.map((h) => (
                    <li key={h.id}>
                      {new Date(h.createdAt).toLocaleString("fr-FR")} — {ACTION_HISTORIQUE_TRANSPORTEUR_LABELS[h.action]}
                      {h.motif ? ` — « ${h.motif} »` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejet / demande de correction — motif obligatoire dans les deux cas
          (besoin métier), bouton désactivé tant qu'il est vide. */}
      <Dialog
        open={actionEnCours !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActionEnCours(null);
            setMotifAction("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionEnCours?.type === "corriger" || actionEnCours?.type === "corriger_vehicule"
                ? "Demander une correction"
                : "Ne pas confirmer"}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={motifAction}
            onChange={(e) => setMotifAction(e.target.value)}
            placeholder="Motif (obligatoire)"
            autoFocus
          />
          <DialogFooter>
            <button
              onClick={() => {
                setActionEnCours(null);
                setMotifAction("");
              }}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerAction}
              disabled={!motifAction.trim()}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-50"
            >
              Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
