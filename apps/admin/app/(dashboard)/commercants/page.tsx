"use client";

import { useEffect, useMemo, useState } from "react";
import { getUtilisateurs, getCourses, getCommercantsBruts, upsertCommercant } from "@/lib/api";
import {
  ACTIVITE_COMMERCE_LABELS,
  VOLUME_LIVRAISONS_LABELS,
  formatFCFA,
  type Commercant,
  type Course,
  type Utilisateur,
} from "@colimo/shared";

interface Brouillon {
  adresse: string;
  responsable: string;
  horaires: string;
  commissionTaux: string;
}

export default function CommercantsPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>({
    adresse: "",
    responsable: "",
    horaires: "",
    commissionTaux: "15",
  });

  useEffect(() => {
    Promise.all([getUtilisateurs(), getCommercantsBruts(), getCourses()])
      .then(([u, c, courses]) => {
        setUtilisateurs(u);
        setCommercants(c);
        setCourses(courses);
      })
      .finally(() => setChargement(false));
  }, []);

  const clientsCommerce = useMemo(
    () => utilisateurs.filter((u) => u.type === "client" && u.typeClient === "commerce"),
    [utilisateurs]
  );

  const fiche = useMemo(
    () => (utilisateurId: string) => commercants.find((c) => c.utilisateurId === utilisateurId),
    [commercants]
  );

  const stats = useMemo(
    () => (utilisateurId: string) => {
      const commandes = courses.filter((c) => c.clientId === utilisateurId);
      const revenus = commandes
        .filter((c) => c.statut === "confirmee" || c.statut === "livree")
        .reduce((total, c) => total + c.prix, 0);
      return { nombre: commandes.length, revenus };
    },
    [courses]
  );

  function commencerEdition(utilisateurId: string) {
    const f = fiche(utilisateurId);
    setEnEdition(utilisateurId);
    setBrouillon({
      adresse: f?.adresse ?? "",
      responsable: f?.responsable ?? "",
      horaires: f?.horaires ?? "",
      commissionTaux: f ? String(Math.round(f.commissionTaux * 100)) : "15",
    });
  }

  async function enregistrer(utilisateurId: string) {
    const misAJour = await upsertCommercant({
      utilisateurId,
      adresse: brouillon.adresse || undefined,
      responsable: brouillon.responsable || undefined,
      horaires: brouillon.horaires || undefined,
      commissionTaux: (Number(brouillon.commissionTaux) || 15) / 100,
    });
    setCommercants((prev) => {
      const sansAncienne = prev.filter((c) => c.utilisateurId !== utilisateurId);
      return [...sansAncienne, misAJour];
    });
    setEnEdition(null);
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Commerçants</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Clients de type commerce — informations complémentaires et commissions
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {clientsCommerce.map((client) => {
          const f = fiche(client.id);
          const { nombre, revenus } = stats(client.id);
          const enCours = enEdition === client.id;

          return (
            <div key={client.id} className="rounded-2xl border border-colimo-neutre-clair bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">{client.nom}</h2>
                  <p className="mt-0.5 text-sm text-colimo-neutre-fonce/60">
                    {client.telephone} · {client.zone ?? "zone non renseignée"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-colimo-neutre-fonce/60">{nombre} commande(s)</p>
                  <p className="font-titre text-colimo-rouge">{formatFCFA(revenus)}</p>
                </div>
              </div>

              {enCours ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">
                    Adresse
                    <input
                      value={brouillon.adresse}
                      onChange={(e) => setBrouillon((b) => ({ ...b, adresse: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
                    />
                  </label>
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">
                    Responsable
                    <input
                      value={brouillon.responsable}
                      onChange={(e) => setBrouillon((b) => ({ ...b, responsable: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
                    />
                  </label>
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">
                    Horaires
                    <input
                      value={brouillon.horaires}
                      onChange={(e) => setBrouillon((b) => ({ ...b, horaires: e.target.value }))}
                      placeholder="Ex : Lun-Sam 8h-19h"
                      className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
                    />
                  </label>
                  <label className="text-xs font-medium text-colimo-neutre-fonce/60">
                    Commission (%)
                    <input
                      value={brouillon.commissionTaux}
                      onChange={(e) => setBrouillon((b) => ({ ...b, commissionTaux: e.target.value }))}
                      type="number"
                      className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
                    />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      onClick={() => enregistrer(client.id)}
                      className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEnEdition(null)}
                      className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-colimo-neutre-fonce/70">
                    {f ? (
                      <>
                        <p>{f.adresse || "Adresse non renseignée"}</p>
                        <p>
                          {f.responsable || "Responsable non renseigné"} · {f.horaires || "Horaires non renseignés"}{" "}
                          · Commission {Math.round(f.commissionTaux * 100)}%
                        </p>
                        <p className="mt-1 text-xs text-colimo-neutre-fonce/50">
                          {f.activite ? ACTIVITE_COMMERCE_LABELS[f.activite] : "Activité non renseignée"}
                          {" · "}
                          {f.volumeQuotidien ? VOLUME_LIVRAISONS_LABELS[f.volumeQuotidien] : "Volume non renseigné"}
                          {f.whatsapp && ` · WhatsApp ${f.whatsapp}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-colimo-neutre-fonce/40">Fiche non complétée</p>
                    )}
                  </div>
                  <button
                    onClick={() => commencerEdition(client.id)}
                    className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                  >
                    Modifier
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!chargement && clientsCommerce.length === 0 && (
          <p className="text-center text-sm text-colimo-neutre-fonce/50">Aucun client de type commerce inscrit</p>
        )}
      </div>
    </div>
  );
}
