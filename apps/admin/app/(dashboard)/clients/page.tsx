"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatutBadge from "@/components/StatutBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUtilisateurs, getCourses, updateUtilisateur, supprimerCompteUtilisateur } from "@/lib/api";
import { ZONE_LABELS, estCompteSupprime, type Course, type Utilisateur, type Zone } from "@colimo/shared";

type FiltreType = "tous" | "particulier" | "commerce";

const STATUT_CLIENT_LABELS: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  desactive: "Supprimé",
};

export default function ClientsPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<FiltreType>("tous");
  const [afficherSupprimes, setAfficherSupprimes] = useState(false);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<{ nom: string; telephone: string; zone: Zone | "" }>({
    nom: "",
    telephone: "",
    zone: "",
  });
  const [clientASupprimer, setClientASupprimer] = useState<Utilisateur | null>(null);
  const [motifSuppression, setMotifSuppression] = useState("");

  useEffect(() => {
    Promise.all([getUtilisateurs(), getCourses()])
      .then(([u, c]) => {
        setUtilisateurs(u);
        setCourses(c);
      })
      .finally(() => setChargement(false));
  }, []);

  const nombreSupprimes = useMemo(
    () => utilisateurs.filter((u) => u.type === "client" && estCompteSupprime(u.telephone)).length,
    [utilisateurs]
  );

  const clients = useMemo(() => {
    return utilisateurs
      .filter((u) => u.type === "client")
      .filter((u) => afficherSupprimes || !estCompteSupprime(u.telephone))
      .filter((u) => filtreType === "tous" || u.typeClient === filtreType)
      .filter((u) => {
        const q = recherche.trim().toLowerCase();
        if (!q) return true;
        return u.nom.toLowerCase().includes(q) || u.telephone.includes(q);
      });
  }, [utilisateurs, filtreType, recherche, afficherSupprimes]);

  const nombreCommandes = useMemo(
    () => (clientId: string) => courses.filter((c) => c.clientId === clientId).length,
    [courses]
  );

  function commencerEdition(client: Utilisateur) {
    setEnEdition(client.id);
    setBrouillon({ nom: client.nom, telephone: client.telephone, zone: client.zone ?? "" });
  }

  async function enregistrerEdition(id: string) {
    const misAJour = await updateUtilisateur(id, {
      nom: brouillon.nom,
      telephone: brouillon.telephone,
      zone: brouillon.zone || undefined,
    });
    setUtilisateurs((prev) => prev.map((u) => (u.id === id ? misAJour : u)));
    setEnEdition(null);
  }

  async function toggleSuspension(client: Utilisateur) {
    const nouveauStatut = client.statut === "suspendu" ? "actif" : "suspendu";
    const misAJour = await updateUtilisateur(client.id, { statut: nouveauStatut });
    setUtilisateurs((prev) => prev.map((u) => (u.id === client.id ? misAJour : u)));
  }

  async function confirmerSuppression() {
    if (!clientASupprimer) return;
    try {
      const resultat = await supprimerCompteUtilisateur(clientASupprimer.id, motifSuppression.trim() || undefined);
      if (resultat.mode === "suppression_definitive") {
        setUtilisateurs((prev) => prev.filter((u) => u.id !== clientASupprimer.id));
        window.alert(`Compte de ${clientASupprimer.nom} supprimé définitivement.`);
      } else if (resultat.utilisateur) {
        setUtilisateurs((prev) => prev.map((u) => (u.id === clientASupprimer.id ? resultat.utilisateur! : u)));
        window.alert(
          `Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement (l'historique de courses/paiements est conservé).`
        );
      }
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de supprimer ce compte.");
    } finally {
      setClientASupprimer(null);
      setMotifSuppression("");
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Clients</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Particuliers et commerces inscrits sur la plateforme
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          className="w-72 rounded-lg border border-colimo-neutre-clair px-3 py-2 text-sm focus:border-colimo-rouge focus:outline-none"
        />
        <div className="flex gap-1 rounded-lg border border-colimo-neutre-clair p-1">
          {(["tous", "particulier", "commerce"] as FiltreType[]).map((valeur) => (
            <button
              key={valeur}
              onClick={() => setFiltreType(valeur)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                filtreType === valeur
                  ? "bg-colimo-rouge text-white"
                  : "text-colimo-neutre-fonce/70 hover:bg-colimo-neutre-clair"
              }`}
            >
              {valeur}
            </button>
          ))}
        </div>
        {nombreSupprimes > 0 && (
          <label className="flex items-center gap-2 text-xs text-colimo-neutre-fonce/60">
            <input type="checkbox" checked={afficherSupprimes} onChange={(e) => setAfficherSupprimes(e.target.checked)} />
            Afficher les comptes supprimés ({nombreSupprimes})
          </label>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Commandes</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const enCours = enEdition === client.id;
              return (
                <TableRow key={client.id} className="border-colimo-neutre-clair">
                  <TableCell>
                    {enCours ? (
                      <Input
                        value={brouillon.nom}
                        onChange={(e) => setBrouillon((b) => ({ ...b, nom: e.target.value }))}
                        className="h-auto w-40 px-2 py-1 text-sm"
                      />
                    ) : (
                      client.nom
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{client.typeClient ?? "particulier"}</TableCell>
                  <TableCell>
                    {enCours ? (
                      <Input
                        value={brouillon.telephone}
                        onChange={(e) => setBrouillon((b) => ({ ...b, telephone: e.target.value }))}
                        className="h-auto w-32 px-2 py-1 text-sm"
                      />
                    ) : (
                      client.telephone
                    )}
                  </TableCell>
                  <TableCell>
                    {enCours ? (
                      <Select
                        value={brouillon.zone || "aucune"}
                        onValueChange={(v) => setBrouillon((b) => ({ ...b, zone: v === "aucune" ? "" : (v as Zone) }))}
                      >
                        <SelectTrigger className="h-auto px-2 py-1 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aucune">—</SelectItem>
                          {(Object.keys(ZONE_LABELS) as Zone[]).map((zone) => (
                            <SelectItem key={zone} value={zone}>
                              {ZONE_LABELS[zone]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : client.zone ? (
                      ZONE_LABELS[client.zone]
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/courses?clientId=${client.id}`} className="text-colimo-rouge hover:underline">
                      {nombreCommandes(client.id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatutBadge statut={client.statut} label={STATUT_CLIENT_LABELS[client.statut] ?? "Actif"} />
                  </TableCell>
                  <TableCell>
                    {estCompteSupprime(client.telephone) ? (
                      <span className="text-xs text-colimo-neutre-fonce/40">Compte supprimé — aucune action possible</span>
                    ) : enCours ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => enregistrerEdition(client.id)}
                          className="rounded-md bg-colimo-rouge px-2.5 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                        >
                          Enregistrer
                        </button>
                        <button
                          onClick={() => setEnEdition(null)}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => commencerEdition(client)}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => toggleSuspension(client)}
                          className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          {client.statut === "suspendu" ? "Réactiver" : "Suspendre"}
                        </button>
                        <button
                          onClick={() => setClientASupprimer(client)}
                          className="rounded-md border border-colimo-rouge/30 px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!chargement && clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={clientASupprimer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClientASupprimer(null);
            setMotifSuppression("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le compte de {clientASupprimer?.nom} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-colimo-neutre-fonce/70">
            Si ce compte n&apos;a aucun historique (aucune course, aucun avis...), il sera supprimé définitivement, y
            compris de Supabase Auth. S&apos;il a de l&apos;historique, ses données personnelles seront anonymisées
            et sa connexion bloquée définitivement — mais son historique de courses/paiements sera conservé. Cette
            action est irréversible.
          </p>
          <Input
            value={motifSuppression}
            onChange={(e) => setMotifSuppression(e.target.value)}
            placeholder="Motif de la suppression (optionnel)"
          />
          <DialogFooter>
            <button
              onClick={() => setClientASupprimer(null)}
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
