"use client";

import { useEffect, useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import {
  getHistoriqueInvitationsAdmin,
  getIdAdminConnecte,
  getUtilisateurs,
  inviterAdministrateur,
  updateUtilisateur,
} from "@/lib/api";
import type { HistoriqueInvitationAdmin, Utilisateur } from "@colimo/shared";

export default function AdministrateursPage() {
  const [administrateurs, setAdministrateurs] = useState<Utilisateur[]>([]);
  const [historique, setHistorique] = useState<HistoriqueInvitationAdmin[]>([]);
  const [monId, setMonId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  async function chargerTout() {
    const [utilisateurs, monHistorique, id] = await Promise.all([
      getUtilisateurs(),
      getHistoriqueInvitationsAdmin(),
      getIdAdminConnecte(),
    ]);
    setAdministrateurs(utilisateurs.filter((u) => u.type === "admin"));
    setHistorique(monHistorique);
    setMonId(id);
  }

  useEffect(() => {
    chargerTout().finally(() => setChargement(false));
  }, []);

  const invitationParUtilisateur = useMemo(() => {
    const map = new Map<string, HistoriqueInvitationAdmin>();
    for (const h of historique) {
      // Le plus ancien enregistrement suffit (un admin n'est invité qu'une fois).
      if (!map.has(h.utilisateurId)) map.set(h.utilisateurId, h);
    }
    return map;
  }, [historique]);

  const nomParId = useMemo(() => new Map(administrateurs.map((a) => [a.id, a.nom])), [administrateurs]);

  async function envoyerInvitation() {
    if (!nom.trim() || !email.trim() || !telephone.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      await inviterAdministrateur({ nom: nom.trim(), email: email.trim(), telephone: telephone.trim() });
      setNom("");
      setEmail("");
      setTelephone("");
      window.alert(`Invitation envoyée à ${email.trim()}. Le compte sera actif une fois le mot de passe défini.`);
      await chargerTout();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer cette invitation.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function basculerAcces(administrateur: Utilisateur) {
    const nouveauStatut = administrateur.statut === "suspendu" ? "actif" : "suspendu";
    const verbe = nouveauStatut === "suspendu" ? "Suspendre" : "Réactiver";
    if (!window.confirm(`${verbe} l'accès admin de ${administrateur.nom} ?`)) return;
    try {
      const misAJour = await updateUtilisateur(administrateur.id, { statut: nouveauStatut });
      setAdministrateurs((prev) => prev.map((a) => (a.id === administrateur.id ? misAJour : a)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible de modifier l'accès de ce compte.");
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Administrateurs</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Invitez d&apos;autres administrateurs et gérez leur accès au back-office.
      </p>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Inviter un administrateur</h2>
        <p className="mt-1 text-xs text-colimo-neutre-fonce/60">
          Un email d&apos;invitation lui sera envoyé avec un lien pour définir son mot de passe.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom complet"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Adresse email"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Téléphone"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
        </div>
        {erreur && <p className="mt-3 text-sm text-colimo-rouge">{erreur}</p>}
        <button
          onClick={envoyerInvitation}
          disabled={envoiEnCours || !nom.trim() || !email.trim() || !telephone.trim()}
          className="mt-4 rounded-md bg-colimo-rouge px-4 py-2 text-sm font-medium text-white hover:bg-colimo-rouge-fonce disabled:opacity-40"
        >
          {envoiEnCours ? "Envoi..." : "Envoyer l'invitation"}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-colimo-neutre-clair text-colimo-neutre-fonce/60">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Invité par</th>
              <th className="px-4 py-3 font-medium">Depuis</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {administrateurs.map((admin) => {
              const invitation = invitationParUtilisateur.get(admin.id);
              const estMoi = admin.id === monId;
              return (
                <tr key={admin.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3 font-medium text-colimo-neutre-fonce">
                    {admin.nom} {estMoi && <span className="text-xs text-colimo-neutre-fonce/40">(vous)</span>}
                  </td>
                  <td className="px-4 py-3">{admin.telephone}</td>
                  <td className="px-4 py-3">
                    <StatutBadge
                      statut={admin.statut === "suspendu" ? "suspendu" : "actif"}
                      label={admin.statut === "suspendu" ? "Suspendu" : "Actif"}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                    {invitation ? (nomParId.get(invitation.invitePar) ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                    {invitation ? new Date(invitation.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!estMoi && (
                      <button
                        onClick={() => basculerAcces(admin)}
                        className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
                      >
                        {admin.statut === "suspendu" ? "Réactiver" : "Suspendre"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!chargement && administrateurs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun administrateur
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
