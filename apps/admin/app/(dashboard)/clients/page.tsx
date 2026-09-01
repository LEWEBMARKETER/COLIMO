"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StatutBadge from "@/components/StatutBadge";
import { getUtilisateurs, getCourses, updateUtilisateur, supprimerCompteUtilisateur } from "@/lib/api";
import { ZONE_LABELS, type Course, type Utilisateur, type Zone } from "@colimo/shared";

type FiltreType = "tous" | "particulier" | "commerce";

export default function ClientsPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [filtreType, setFiltreType] = useState<FiltreType>("tous");
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<{ nom: string; telephone: string; zone: Zone | "" }>({
    nom: "",
    telephone: "",
    zone: "",
  });

  useEffect(() => {
    Promise.all([getUtilisateurs(), getCourses()])
      .then(([u, c]) => {
        setUtilisateurs(u);
        setCourses(c);
      })
      .finally(() => setChargement(false));
  }, []);

  const clients = useMemo(() => {
    return utilisateurs
      .filter((u) => u.type === "client")
      .filter((u) => filtreType === "tous" || u.typeClient === filtreType)
      .filter((u) => {
        const q = recherche.trim().toLowerCase();
        if (!q) return true;
        return u.nom.toLowerCase().includes(q) || u.telephone.includes(q);
      });
  }, [utilisateurs, filtreType, recherche]);

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

  async function supprimerCompte(client: Utilisateur) {
    if (
      !window.confirm(
        `Supprimer le compte de ${client.nom} ?\n\nSi ce compte n'a aucun historique (aucune course, aucun avis...), il sera supprimé définitivement, y compris de Supabase Auth. S'il a de l'historique, ses données personnelles seront anonymisées et sa connexion bloquée définitivement — mais son historique de courses/paiements sera conservé.\n\nCette action est irréversible.`
      )
    ) {
      return;
    }
    const motif = window.prompt("Motif de la suppression (optionnel) :") ?? undefined;
    try {
      const resultat = await supprimerCompteUtilisateur(client.id, motif || undefined);
      if (resultat.mode === "suppression_definitive") {
        setUtilisateurs((prev) => prev.filter((u) => u.id !== client.id));
        window.alert(`Compte de ${client.nom} supprimé définitivement.`);
      } else if (resultat.utilisateur) {
        setUtilisateurs((prev) => prev.map((u) => (u.id === client.id ? resultat.utilisateur! : u)));
        window.alert(
          `Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement (l'historique de courses/paiements est conservé).`
        );
      }
    } catch (erreur) {
      window.alert(erreur instanceof Error ? erreur.message : "Impossible de supprimer ce compte.");
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
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Commandes</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const enCours = enEdition === client.id;
              return (
                <tr key={client.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3">
                    {enCours ? (
                      <input
                        value={brouillon.nom}
                        onChange={(e) => setBrouillon((b) => ({ ...b, nom: e.target.value }))}
                        className="w-40 rounded-md border border-colimo-neutre-clair px-2 py-1 text-sm"
                      />
                    ) : (
                      client.nom
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{client.typeClient ?? "particulier"}</td>
                  <td className="px-4 py-3">
                    {enCours ? (
                      <input
                        value={brouillon.telephone}
                        onChange={(e) => setBrouillon((b) => ({ ...b, telephone: e.target.value }))}
                        className="w-32 rounded-md border border-colimo-neutre-clair px-2 py-1 text-sm"
                      />
                    ) : (
                      client.telephone
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {enCours ? (
                      <select
                        value={brouillon.zone}
                        onChange={(e) => setBrouillon((b) => ({ ...b, zone: e.target.value as Zone }))}
                        className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-sm"
                      >
                        <option value="">—</option>
                        {(Object.keys(ZONE_LABELS) as Zone[]).map((zone) => (
                          <option key={zone} value={zone}>
                            {ZONE_LABELS[zone]}
                          </option>
                        ))}
                      </select>
                    ) : client.zone ? (
                      ZONE_LABELS[client.zone]
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/courses?clientId=${client.id}`} className="text-colimo-rouge hover:underline">
                      {nombreCommandes(client.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge
                      statut={client.statut}
                      label={client.statut === "suspendu" ? "Suspendu" : "Actif"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {enCours ? (
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
                          onClick={() => supprimerCompte(client)}
                          className="rounded-md border border-colimo-rouge/30 px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!chargement && clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun client trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
