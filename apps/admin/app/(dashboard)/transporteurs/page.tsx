"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatutBadge from "@/components/StatutBadge";
import {
  definirModuleTransportActif,
  getConfigurationModuleTransport,
  getTransporteurs,
  getUtilisateurs,
  getVehiculesTransporteur,
  rejeterDossierTransporteur,
  rejeterVehiculeTransporteur,
  validerDossierTransporteur,
  validerVehiculeTransporteur,
} from "@/lib/api";
import {
  TYPE_VEHICULE_TRANSPORT_LABELS,
  ZONE_LABELS,
  type ConfigurationModuleTransport,
  type Transporteur,
  type Utilisateur,
  type VehiculeTransporteur,
  type VerificationStatus,
} from "@colimo/shared";

const STATUT_VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  en_attente: "En attente",
  valide: "Validé",
  rejete: "Rejeté",
};

export default function TransporteursPage() {
  const [transporteurs, setTransporteurs] = useState<Transporteur[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [vehiculesParTransporteur, setVehiculesParTransporteur] = useState<Map<string, VehiculeTransporteur[]>>(new Map());
  const [config, setConfig] = useState<ConfigurationModuleTransport | null>(null);
  const [chargement, setChargement] = useState(true);
  const [transporteurARejeter, setTransporteurARejeter] = useState<string | null>(null);
  const [motifRejet, setMotifRejet] = useState("");

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

  async function basculerModule() {
    if (!config) return;
    await definirModuleTransportActif(!config.actif);
    await chargerTout();
  }

  async function valider(transporteurId: string) {
    await validerDossierTransporteur(transporteurId);
    await chargerTout();
  }

  async function confirmerRejet() {
    if (!transporteurARejeter) return;
    await rejeterDossierTransporteur(transporteurARejeter, motifRejet.trim() || undefined);
    setTransporteurARejeter(null);
    setMotifRejet("");
    await chargerTout();
  }

  async function validerVehicule(vehiculeId: string) {
    await validerVehiculeTransporteur(vehiculeId);
    await chargerTout();
  }

  async function rejeterVehicule(vehiculeId: string) {
    await rejeterVehiculeTransporteur(vehiculeId);
    await chargerTout();
  }

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
      <p className="mt-1 text-sm text-colimo-neutre-fonce/50">
        Tant que le module est inactif, l&apos;inscription transporteur reste accessible mais aucune entrée ne doit être
        exposée côté client dans les écrans qui en dépendent.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Transporteur</TableHead>
              <TableHead>Statut du dossier</TableHead>
              <TableHead>Zones couvertes</TableHead>
              <TableHead>Véhicules</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transporteurs.map((t) => {
              const vehicules = vehiculesParTransporteur.get(t.id) ?? [];
              return (
                <TableRow key={t.id} className="border-colimo-neutre-clair align-top">
                  <TableCell>
                    <p className="font-medium text-colimo-neutre-fonce">{nomTransporteur(t)}</p>
                    <p className="text-xs text-colimo-neutre-fonce/50">{utilisateurParId.get(t.utilisateurId)?.telephone}</p>
                  </TableCell>
                  <TableCell>
                    <StatutBadge statut={t.statutVerification} label={STATUT_VERIFICATION_LABELS[t.statutVerification]} />
                  </TableCell>
                  <TableCell>{t.zonesCouvertes.map((z) => ZONE_LABELS[z]).join(", ") || "—"}</TableCell>
                  <TableCell>
                    {vehicules.length === 0 ? (
                      <span className="text-xs text-colimo-neutre-fonce/40">Aucun véhicule</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {vehicules.map((v) => (
                          <div key={v.id} className="flex items-center gap-2 text-xs">
                            <span className="text-colimo-neutre-fonce">
                              {TYPE_VEHICULE_TRANSPORT_LABELS[v.typeVehicule]} — {v.plaqueImmatriculation}
                            </span>
                            <StatutBadge statut={v.statutVerification} label={STATUT_VERIFICATION_LABELS[v.statutVerification]} />
                            {v.statutVerification === "en_attente" && (
                              <>
                                <button
                                  onClick={() => validerVehicule(v.id)}
                                  className="rounded border border-colimo-neutre-clair px-1.5 py-0.5 text-[11px] font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                                >
                                  Valider
                                </button>
                                <button
                                  onClick={() => rejeterVehicule(v.id)}
                                  className="rounded border border-colimo-neutre-clair px-1.5 py-0.5 text-[11px] font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                                >
                                  Rejeter
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.statutVerification === "en_attente" && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => valider(t.id)}
                          className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setTransporteurARejeter(t.id)}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Rejeter
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!chargement && transporteurs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun transporteur inscrit
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={transporteurARejeter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransporteurARejeter(null);
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
              onClick={() => setTransporteurARejeter(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerRejet}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Rejeter le dossier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
