"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import {
  activerAbonnementCommerce,
  desactiverAbonnementCommerce,
  getCommercantsBruts,
  getCourses,
  getConfigurationPaiementAbonnement,
  getDemandesAbonnement,
  getHistoriqueAbonnements,
  getUtilisateurs,
  patchConfigurationPaiementAbonnement,
  reactiverAbonnementCommerce,
  refuserDemandeAbonnement,
  suspendreAbonnementCommerce,
  upsertCommercant,
} from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  ACTION_HISTORIQUE_ABONNEMENT_LABELS,
  ACTIVITE_COMMERCE_LABELS,
  PRIX_PACK_BUSINESS,
  PRIX_PACK_STARTER,
  STATUT_DEMANDE_ABONNEMENT_LABELS,
  SUBSCRIPTION_PLAN_LABELS,
  VOLUME_LIVRAISONS_LABELS,
  calculerPlanEffectif,
  formatFCFA,
  joursAvantExpiration,
  type Commercant,
  type ConfigurationPaiementAbonnement,
  type Course,
  type DemandeAbonnement,
  type HistoriqueAbonnement,
  type PackPayant,
  type SubscriptionPlan,
  type Utilisateur,
} from "@colimo/shared";

interface Brouillon {
  adresse: string;
  responsable: string;
  horaires: string;
  commissionTaux: string;
}

const SECTIONS = ["liste", "abonnements", "historique", "parametres"] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<Section, string> = {
  liste: "Liste",
  abonnements: "Abonnements",
  historique: "Historique",
  parametres: "Paramètres",
};

export default function CommercantsPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [demandes, setDemandes] = useState<DemandeAbonnement[]>([]);
  const [historique, setHistorique] = useState<HistoriqueAbonnement[]>([]);
  const [configPaiement, setConfigPaiement] = useState<ConfigurationPaiementAbonnement | null>(null);
  const [chargement, setChargement] = useState(true);
  const [section, setSection] = useState<Section>("liste");

  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>({
    adresse: "",
    responsable: "",
    horaires: "",
    commissionTaux: "15",
  });

  const [panneauActivation, setPanneauActivation] = useState<{ commerceId: string; pack: PackPayant } | null>(null);
  const [dateDebut, setDateDebut] = useState("");
  const [dureeJours, setDureeJours] = useState("30");
  const [motifAction, setMotifAction] = useState("");
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const [brouillonConfig, setBrouillonConfig] = useState<ConfigurationPaiementAbonnement | null>(null);

  useEffect(() => {
    charger();
  }, []);

  function charger() {
    setChargement(true);
    return Promise.all([
      getUtilisateurs(),
      getCommercantsBruts(),
      getCourses(),
      getDemandesAbonnement(),
      getHistoriqueAbonnements(),
      getConfigurationPaiementAbonnement(),
    ])
      .then(([u, c, co, d, h, config]) => {
        setUtilisateurs(u);
        setCommercants(c);
        setCourses(co);
        setDemandes(d);
        setHistorique(h);
        setConfigPaiement(config);
        setBrouillonConfig(config);
      })
      .finally(() => setChargement(false));
  }

  const clientsCommerce = useMemo(
    () => utilisateurs.filter((u) => u.type === "client" && u.typeClient === "commerce"),
    [utilisateurs]
  );

  const fiche = useMemo(
    () => (utilisateurId: string) => commercants.find((c) => c.utilisateurId === utilisateurId),
    [commercants]
  );

  const nomUtilisateur = useMemo(
    () => (id: string) => utilisateurs.find((u) => u.id === id)?.nom ?? "—",
    [utilisateurs]
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

  // --- Onglet Liste (inchangé) ------------------------------------------

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
    setCommercants((prev) => [...prev.filter((c) => c.utilisateurId !== utilisateurId), misAJour]);
    setEnEdition(null);
  }

  // --- Onglet Abonnements -------------------------------------------------

  const commercesAvecPlan = useMemo(
    () =>
      clientsCommerce
        .map((u) => ({ utilisateur: u, commerce: fiche(u.id) }))
        .filter((x): x is { utilisateur: Utilisateur; commerce: Commercant } => Boolean(x.commerce)),
    [clientsCommerce, fiche]
  );

  const tableauAbonnements = useMemo(() => {
    const parPlan: Record<SubscriptionPlan, number> = { gratuit: 0, starter: 0, business: 0 };
    let expirantBientot = 0;
    let expires = 0;
    for (const { commerce } of commercesAvecPlan) {
      const planEffectif = calculerPlanEffectif(commerce);
      parPlan[planEffectif]++;
      const jours = joursAvantExpiration(commerce);
      if (planEffectif !== "gratuit" && jours !== null && jours >= 0 && jours <= 7) expirantBientot++;
      if (commerce.subscriptionPlan !== "gratuit" && planEffectif === "gratuit") expires++;
    }
    const demandesEnAttente = demandes.filter((d) => !["active", "refuse", "expire"].includes(d.statut)).length;
    return {
      parPlan,
      actifs: parPlan.starter + parPlan.business,
      expirantBientot,
      expires,
      demandesEnAttente,
      revenusStarter: parPlan.starter * PRIX_PACK_STARTER,
      revenusBusiness: parPlan.business * PRIX_PACK_BUSINESS,
    };
  }, [commercesAvecPlan, demandes]);

  function ouvrirPanneauActivation(commerceId: string, pack: PackPayant) {
    setPanneauActivation({ commerceId, pack });
    setDateDebut(new Date().toISOString().slice(0, 10));
    setDureeJours("30");
    setMotifAction("");
  }

  function fermerPanneauActivation() {
    setPanneauActivation(null);
    setMotifAction("");
  }

  async function confirmerActivation() {
    if (!panneauActivation) return;
    setActionEnCours(panneauActivation.commerceId);
    try {
      const commerce = await activerAbonnementCommerce({
        commerceId: panneauActivation.commerceId,
        pack: panneauActivation.pack,
        dateDebut: dateDebut || undefined,
        dureeJours: Number(dureeJours) || undefined,
        motif: motifAction.trim() || undefined,
      });
      setCommercants((prev) => [...prev.filter((c) => c.id !== commerce.id), commerce]);
      await notifierEvenement("abonnement_active", {
        destinataire: commerce.utilisateurId,
        utilisateurId: commerce.utilisateurId,
        variables: {
          pack: SUBSCRIPTION_PLAN_LABELS[panneauActivation.pack],
          date_expiration: commerce.abonnementExpireLe
            ? new Date(commerce.abonnementExpireLe).toLocaleDateString("fr-FR")
            : "",
        },
      });
      const demandesLiees = demandes.filter((d) => d.commerceId === commerce.id);
      if (demandesLiees.length > 0) {
        setDemandes((prev) =>
          prev.map((d) => (d.commerceId === commerce.id && d.statut !== "refuse" ? { ...d, statut: "active" } : d))
        );
      }
      fermerPanneauActivation();
    } finally {
      setActionEnCours(null);
    }
  }

  async function desactiver(commerceId: string) {
    if (!window.confirm("Désactiver l'abonnement de ce commerce ? Le compte repasse au niveau Gratuit.")) return;
    setActionEnCours(commerceId);
    try {
      const commerce = await desactiverAbonnementCommerce(commerceId);
      setCommercants((prev) => [...prev.filter((c) => c.id !== commerce.id), commerce]);
      await notifierEvenement("abonnement_expire", {
        destinataire: commerce.utilisateurId,
        utilisateurId: commerce.utilisateurId,
        variables: {},
      });
    } finally {
      setActionEnCours(null);
    }
  }

  async function suspendre(commerceId: string) {
    const motif = window.prompt("Motif de la suspension (obligatoire) :");
    if (!motif) return;
    setActionEnCours(commerceId);
    try {
      const commerce = await suspendreAbonnementCommerce(commerceId, motif);
      setCommercants((prev) => [...prev.filter((c) => c.id !== commerce.id), commerce]);
    } finally {
      setActionEnCours(null);
    }
  }

  async function reactiver(commerceId: string) {
    setActionEnCours(commerceId);
    try {
      const commerce = await reactiverAbonnementCommerce(commerceId);
      setCommercants((prev) => [...prev.filter((c) => c.id !== commerce.id), commerce]);
    } finally {
      setActionEnCours(null);
    }
  }

  async function refuser(demande: DemandeAbonnement) {
    const motif = window.prompt("Motif du refus (optionnel) :") ?? undefined;
    const misAJour = await refuserDemandeAbonnement(demande.id, motif);
    setDemandes((prev) => prev.map((d) => (d.id === misAJour.id ? misAJour : d)));
    const commerce = commercants.find((c) => c.id === demande.commerceId);
    if (commerce) {
      await notifierEvenement("abonnement_refuse", {
        destinataire: commerce.utilisateurId,
        utilisateurId: commerce.utilisateurId,
        variables: { pack: SUBSCRIPTION_PLAN_LABELS[demande.packDemande] },
      });
    }
  }

  // --- Onglet Paramètres ---------------------------------------------------

  async function enregistrerConfigPaiement() {
    if (!brouillonConfig) return;
    const misAJour = await patchConfigurationPaiementAbonnement({
      numeroPaiement: brouillonConfig.numeroPaiement,
      nomBeneficiaire: brouillonConfig.nomBeneficiaire,
      moyenPaiement: brouillonConfig.moyenPaiement,
      instructions: brouillonConfig.instructions,
      whatsapp: brouillonConfig.whatsapp,
      emailContact: brouillonConfig.emailContact,
    });
    setConfigPaiement(misAJour);
    setBrouillonConfig(misAJour);
  }

  const demandesEnAttenteListe = useMemo(
    () => demandes.filter((d) => !["active", "refuse", "expire"].includes(d.statut)),
    [demandes]
  );

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Commerçants</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">Comptes commerce et abonnements COLIMO PRO</p>

      <div className="mt-4 flex gap-1 border-b border-colimo-neutre-clair">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              section === s
                ? "border-colimo-rouge text-colimo-rouge"
                : "border-transparent text-colimo-neutre-fonce/60 hover:text-colimo-neutre-fonce"
            }`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {section === "liste" && (
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
                    {f && (
                      <span className="mt-1 inline-block rounded-full bg-colimo-neutre-clair px-2 py-0.5 text-xs text-colimo-neutre-fonce/70">
                        {SUBSCRIPTION_PLAN_LABELS[calculerPlanEffectif(f)]}
                      </span>
                    )}
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
      )}

      {section === "abonnements" && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Gratuit" value={String(tableauAbonnements.parPlan.gratuit)} />
            <StatCard label="Starter" value={String(tableauAbonnements.parPlan.starter)} />
            <StatCard label="Business" value={String(tableauAbonnements.parPlan.business)} />
            <StatCard label="Abonnements actifs" value={String(tableauAbonnements.actifs)} sombre />
            <StatCard label="Expirent ≤ 7 jours" value={String(tableauAbonnements.expirantBientot)} />
            <StatCard label="Expirés" value={String(tableauAbonnements.expires)} />
            <StatCard label="Demandes en attente" value={String(tableauAbonnements.demandesEnAttente)} />
            <StatCard
              label="Revenus mensuels (estimés)"
              value={formatFCFA(tableauAbonnements.revenusStarter + tableauAbonnements.revenusBusiness)}
              sombre
            />
          </div>

          {demandesEnAttenteListe.length > 0 && (
            <div>
              <h2 className="mb-2 font-titre text-base font-semibold text-colimo-neutre-fonce">Demandes en attente</h2>
              <div className="flex flex-col gap-2">
                {demandesEnAttenteListe.map((d) => {
                  const commerce = commercants.find((c) => c.id === d.commerceId);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-colimo-neutre-clair bg-white p-4"
                    >
                      <div>
                        <p className="font-medium text-colimo-neutre-fonce">
                          {commerce ? nomUtilisateur(commerce.utilisateurId) : "—"} — Pack{" "}
                          {SUBSCRIPTION_PLAN_LABELS[d.packDemande]}
                        </p>
                        <p className="mt-0.5 text-xs text-colimo-neutre-fonce/50">
                          {STATUT_DEMANDE_ABONNEMENT_LABELS[d.statut]} ·{" "}
                          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => ouvrirPanneauActivation(d.commerceId, d.packDemande)}
                          className="rounded-md bg-colimo-rouge px-3 py-1.5 text-xs font-medium text-white hover:bg-colimo-rouge-fonce"
                        >
                          Activer
                        </button>
                        <button
                          onClick={() => refuser(d)}
                          className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-2 font-titre text-base font-semibold text-colimo-neutre-fonce">Tous les commerces</h2>
            <div className="overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Commerce</th>
                    <th className="px-4 py-3 font-medium">Forfait</th>
                    <th className="px-4 py-3 font-medium">Expiration</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {commercesAvecPlan.map(({ utilisateur, commerce }) => {
                    const planEffectif = calculerPlanEffectif(commerce);
                    return (
                      <tr key={commerce.id} className="border-b border-colimo-neutre-clair last:border-0 align-top">
                        <td className="px-4 py-3">{utilisateur.nom}</td>
                        <td className="px-4 py-3">
                          {SUBSCRIPTION_PLAN_LABELS[planEffectif]}
                          {commerce.abonnementSuspendu && (
                            <span className="ml-1 text-xs text-colimo-rouge">(suspendu)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                          {commerce.abonnementExpireLe
                            ? new Date(commerce.abonnementExpireLe).toLocaleDateString("fr-FR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => ouvrirPanneauActivation(commerce.id, "starter")}
                              disabled={actionEnCours === commerce.id}
                              className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
                            >
                              {planEffectif === "starter" ? "Renouveler Starter" : "Activer Starter"}
                            </button>
                            <button
                              onClick={() => ouvrirPanneauActivation(commerce.id, "business")}
                              disabled={actionEnCours === commerce.id}
                              className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
                            >
                              {planEffectif === "business" ? "Renouveler Business" : "Activer Business"}
                            </button>
                            {planEffectif !== "gratuit" && !commerce.abonnementSuspendu && (
                              <button
                                onClick={() => suspendre(commerce.id)}
                                disabled={actionEnCours === commerce.id}
                                className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
                              >
                                Suspendre
                              </button>
                            )}
                            {commerce.abonnementSuspendu && (
                              <button
                                onClick={() => reactiver(commerce.id)}
                                disabled={actionEnCours === commerce.id}
                                className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
                              >
                                Réactiver
                              </button>
                            )}
                            {commerce.subscriptionPlan !== "gratuit" && (
                              <button
                                onClick={() => desactiver(commerce.id)}
                                disabled={actionEnCours === commerce.id}
                                className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-60"
                              >
                                Désactiver
                              </button>
                            )}
                          </div>

                          {panneauActivation?.commerceId === commerce.id && (
                            <div className="mt-2 w-64 rounded-md border border-colimo-neutre-clair bg-colimo-fond p-2">
                              <p className="mb-2 text-xs font-medium text-colimo-neutre-fonce">
                                {SUBSCRIPTION_PLAN_LABELS[panneauActivation.pack]} — {formatFCFA(
                                  panneauActivation.pack === "starter" ? PRIX_PACK_STARTER : PRIX_PACK_BUSINESS
                                )}
                                /mois
                              </p>
                              <label className="block text-xs text-colimo-neutre-fonce/60">
                                Début
                                <input
                                  type="date"
                                  value={dateDebut}
                                  onChange={(e) => setDateDebut(e.target.value)}
                                  className="mt-0.5 mb-2 w-full rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                                />
                              </label>
                              <label className="block text-xs text-colimo-neutre-fonce/60">
                                Durée (jours)
                                <input
                                  type="number"
                                  value={dureeJours}
                                  onChange={(e) => setDureeJours(e.target.value)}
                                  className="mt-0.5 mb-2 w-full rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                                />
                              </label>
                              <textarea
                                value={motifAction}
                                onChange={(e) => setMotifAction(e.target.value)}
                                placeholder="Motif / commentaire (facultatif)"
                                className="mb-2 w-full rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs"
                                rows={2}
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={confirmerActivation}
                                  disabled={actionEnCours === commerce.id}
                                  className="rounded-md bg-colimo-rouge px-2 py-1 text-xs font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-60"
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={fermerPanneauActivation}
                                  disabled={actionEnCours === commerce.id}
                                  className="rounded-md border border-colimo-neutre-clair px-2 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-white disabled:opacity-60"
                                >
                                  Fermer
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {section === "historique" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <tr>
                <th className="px-4 py-3 font-medium">Commerce</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Ancien → nouveau forfait</th>
                <th className="px-4 py-3 font-medium">Motif</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((h) => {
                const commerce = commercants.find((c) => c.id === h.commerceId);
                return (
                  <tr key={h.id} className="border-b border-colimo-neutre-clair last:border-0">
                    <td className="px-4 py-3">{commerce ? nomUtilisateur(commerce.utilisateurId) : "—"}</td>
                    <td className="px-4 py-3">{ACTION_HISTORIQUE_ABONNEMENT_LABELS[h.action]}</td>
                    <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                      {h.ancienForfait ?? "—"} → {h.nouveauForfait ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-colimo-neutre-fonce/70">{h.motif ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                      {new Date(h.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
              {!chargement && historique.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                    Aucune activité d'abonnement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {section === "parametres" && brouillonConfig && (
        <div className="mt-6 max-w-xl rounded-2xl border border-colimo-neutre-clair bg-white p-5">
          <h2 className="mb-1 font-titre text-base font-semibold text-colimo-neutre-fonce">
            Informations de paiement hors plateforme
          </h2>
          <p className="mb-4 text-sm text-colimo-neutre-fonce/60">
            Affichées au commerçant après une demande d'activation — jamais codées en dur.
          </p>
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              Moyen de paiement
              <input
                value={brouillonConfig.moyenPaiement}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, moyenPaiement: e.target.value } : c))}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              Numéro de paiement
              <input
                value={brouillonConfig.numeroPaiement}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, numeroPaiement: e.target.value } : c))}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              Nom du bénéficiaire
              <input
                value={brouillonConfig.nomBeneficiaire}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, nomBeneficiaire: e.target.value } : c))}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              Instructions
              <textarea
                value={brouillonConfig.instructions}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, instructions: e.target.value } : c))}
                rows={3}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              WhatsApp
              <input
                value={brouillonConfig.whatsapp}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, whatsapp: e.target.value } : c))}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <label className="text-xs font-medium text-colimo-neutre-fonce/60">
              Email de contact
              <input
                value={brouillonConfig.emailContact}
                onChange={(e) => setBrouillonConfig((c) => (c ? { ...c, emailContact: e.target.value } : c))}
                className="mt-1 w-full rounded-md border border-colimo-neutre-clair px-2 py-1.5 text-sm text-colimo-neutre-fonce"
              />
            </label>
            <button
              onClick={enregistrerConfigPaiement}
              className="self-start rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
