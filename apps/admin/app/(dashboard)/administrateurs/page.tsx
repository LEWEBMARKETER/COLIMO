"use client";

import { useEffect, useMemo, useState } from "react";
import StatutBadge from "@/components/StatutBadge";
import {
  getHistoriqueInvitationsAdmin,
  getIdAdminConnecte,
  getUtilisateurs,
  inviterAdministrateur,
  modifierAdministrateur,
  supprimerCompteUtilisateur,
} from "@/lib/api";
import { POLES_ADMIN, POLE_ADMIN_LABELS, type HistoriqueInvitationAdmin, type PoleAdmin, type Utilisateur } from "@colimo/shared";

function badgeStatutAdmin(administrateur: Utilisateur) {
  if (administrateur.statutInvitation === "en_cours") return { statut: "invitation_en_cours", label: "En cours" };
  if (administrateur.statutInvitation === "refuse") return { statut: "invitation_refuse", label: "Non confirmé / Refusé" };
  if (administrateur.statut === "suspendu") return { statut: "suspendu", label: "Suspendu" };
  return { statut: "invitation_confirme", label: "Confirmé" };
}

export default function AdministrateursPage() {
  const [administrateurs, setAdministrateurs] = useState<Utilisateur[]>([]);
  const [historique, setHistorique] = useState<HistoriqueInvitationAdmin[]>([]);
  const [monId, setMonId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [actionEnCoursId, setActionEnCoursId] = useState<string | null>(null);

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [pole, setPole] = useState<PoleAdmin>("operations");

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
      await inviterAdministrateur({ nom: nom.trim(), email: email.trim().toLowerCase(), telephone: telephone.trim(), pole });
      setNom("");
      setEmail("");
      setTelephone("");
      setPole("operations");
      window.alert(`Invitation envoyée à ${email.trim()}. Le compte sera actif une fois l'invitation confirmée.`);
      await chargerTout();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer cette invitation.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function executerAction(
    administrateur: Utilisateur,
    action: "modifier_role" | "suspendre" | "reactiver" | "renvoyer_invitation" | "annuler_invitation",
    confirmation: string,
    nouveauPole?: PoleAdmin
  ) {
    if (!window.confirm(confirmation)) return;
    setActionEnCoursId(administrateur.id);
    try {
      const misAJour = await modifierAdministrateur(administrateur.id, action, nouveauPole);
      setAdministrateurs((prev) => prev.map((a) => (a.id === administrateur.id ? misAJour : a)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible d'effectuer cette action.");
    } finally {
      setActionEnCoursId(null);
    }
  }

  async function modifierRole(administrateur: Utilisateur) {
    const libelles = POLES_ADMIN.map((p, i) => `${i + 1}. ${p.libelle}`).join("\n");
    const choix = window.prompt(`Nouveau pôle pour ${administrateur.nom} :\n${libelles}\n\nEntrez le numéro (1-4) :`);
    if (!choix) return;
    const index = Number(choix.trim()) - 1;
    const nouveauPole = POLES_ADMIN[index]?.valeur;
    if (!nouveauPole) {
      window.alert("Choix invalide.");
      return;
    }
    await executerAction(
      administrateur,
      "modifier_role",
      `Changer le pôle de ${administrateur.nom} en « ${POLE_ADMIN_LABELS[nouveauPole]} » ?`,
      nouveauPole
    );
  }

  // Réutilise la route de suppression de compte générique (déjà utilisée
  // pour clients/coursiers) : suppression réelle si aucun historique, sinon
  // anonymisation + bannissement définitif — le serveur réserve cette action
  // aux admins ciblant un autre admin au Super Admin (0046 + route
  // api/utilisateurs/[id]).
  async function supprimerAdministrateur(administrateur: Utilisateur) {
    if (
      !window.confirm(
        `Supprimer définitivement le compte de ${administrateur.nom} ?\n\nSi ce compte n'a aucun historique d'actions, il sera supprimé définitivement. S'il a de l'historique (invitations envoyées, actions journalisées...), ses données personnelles seront anonymisées et sa connexion bloquée définitivement.\n\nCette action est irréversible.`
      )
    ) {
      return;
    }
    const motif = window.prompt("Motif de la suppression (optionnel) :") ?? undefined;
    setActionEnCoursId(administrateur.id);
    try {
      const resultat = await supprimerCompteUtilisateur(administrateur.id, motif || undefined);
      if (resultat.mode === "suppression_definitive") {
        setAdministrateurs((prev) => prev.filter((a) => a.id !== administrateur.id));
        window.alert(`Compte de ${administrateur.nom} supprimé définitivement.`);
      } else if (resultat.utilisateur) {
        setAdministrateurs((prev) => prev.map((a) => (a.id === administrateur.id ? resultat.utilisateur! : a)));
        window.alert(
          `Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement.`
        );
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible de supprimer ce compte.");
    } finally {
      setActionEnCoursId(null);
    }
  }

  return (
    <div>
      <h1 className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">Administrateurs</h1>
      <p className="mt-1 text-sm text-colimo-neutre-fonce/70">
        Invitez d&apos;autres administrateurs, assignez-leur un pôle et gérez leur accès au back-office.
      </p>

      <div className="mt-6 rounded-2xl border border-colimo-neutre-clair bg-white p-5">
        <h2 className="font-titre text-base font-semibold text-colimo-neutre-fonce">Inviter un administrateur</h2>
        <p className="mt-1 text-xs text-colimo-neutre-fonce/60">
          Un email d&apos;invitation lui sera envoyé avec un lien pour confirmer son accès et définir son mot de passe.
          Tant que l&apos;invitation n&apos;est pas confirmée, aucun accès au back-office n&apos;est accordé.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Adresse email"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="Téléphone"
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          />
          <select
            value={pole}
            onChange={(e) => setPole(e.target.value as PoleAdmin)}
            className="rounded-md border border-colimo-neutre-clair px-3 py-2 text-sm"
          >
            {POLES_ADMIN.map((p) => (
              <option key={p.valeur} value={p.valeur}>
                {p.libelle}
              </option>
            ))}
          </select>
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
              <th className="px-4 py-3 font-medium">Pôle</th>
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
              const badge = badgeStatutAdmin(admin);
              const enCours = admin.statutInvitation === "en_cours";
              const confirme = admin.statutInvitation === "confirme";
              const actionEnCours = actionEnCoursId === admin.id;
              return (
                <tr key={admin.id} className="border-b border-colimo-neutre-clair last:border-0">
                  <td className="px-4 py-3 font-medium text-colimo-neutre-fonce">
                    {admin.nom} {estMoi && <span className="text-xs text-colimo-neutre-fonce/40">(vous)</span>}
                  </td>
                  <td className="px-4 py-3">{admin.telephone}</td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                    {admin.poleAdmin ? POLE_ADMIN_LABELS[admin.poleAdmin] : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={badge.statut} label={badge.label} />
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/70">
                    {invitation ? (nomParId.get(invitation.invitePar) ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-colimo-neutre-fonce/50">
                    {invitation ? new Date(invitation.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!estMoi && (
                      <div className="flex flex-wrap gap-2">
                        {enCours && (
                          <>
                            <button
                              disabled={actionEnCours}
                              onClick={() =>
                                executerAction(
                                  admin,
                                  "renvoyer_invitation",
                                  `Renvoyer l'invitation à ${admin.nom} ?`
                                )
                              }
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                            >
                              Renvoyer l&apos;invitation
                            </button>
                            <button
                              disabled={actionEnCours}
                              onClick={() =>
                                executerAction(
                                  admin,
                                  "annuler_invitation",
                                  `Annuler l'invitation de ${admin.nom} ? Cette action est irréversible.`
                                )
                              }
                              className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-neutre-clair disabled:opacity-40"
                            >
                              Annuler l&apos;invitation
                            </button>
                          </>
                        )}
                        {(confirme || enCours) && (
                          <button
                            disabled={actionEnCours}
                            onClick={() => modifierRole(admin)}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                          >
                            Modifier le rôle
                          </button>
                        )}
                        {confirme && (
                          <button
                            disabled={actionEnCours}
                            onClick={() =>
                              executerAction(
                                admin,
                                admin.statut === "suspendu" ? "reactiver" : "suspendre",
                                `${admin.statut === "suspendu" ? "Réactiver" : "Suspendre"} l'accès admin de ${admin.nom} ?`
                              )
                            }
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                          >
                            {admin.statut === "suspendu" ? "Réactiver" : "Suspendre"}
                          </button>
                        )}
                        <button
                          disabled={actionEnCours}
                          onClick={() => supprimerAdministrateur(admin)}
                          className="rounded-md border border-colimo-rouge/30 px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:opacity-40"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!chargement && administrateurs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-colimo-neutre-fonce/50">
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
