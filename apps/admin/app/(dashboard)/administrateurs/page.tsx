"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getHistoriqueInvitationsAdmin,
  getIdAdminConnecte,
  getUtilisateurs,
  inviterAdministrateur,
  modifierAdministrateur,
  supprimerCompteUtilisateur,
} from "@/lib/api";
import {
  estCompteSupprime,
  POLES_ADMIN,
  POLE_ADMIN_LABELS,
  type HistoriqueInvitationAdmin,
  type PoleAdmin,
  type Utilisateur,
} from "@colimo/shared";

// Un compte admin "supprimé" sans historique disparaît réellement (plus de
// ligne utilisateurs) ; s'il avait de l'historique, il est anonymisé
// (nom="Utilisateur supprimé", statut='desactive') et reste dans la liste —
// vérifié en premier, sinon ce badge retombait sur "Confirmé" par défaut
// (statutInvitation reste 'confirme', l'anonymisation ne le touche pas) et
// les boutons Suspendre/Modifier le rôle/Supprimer restaient affichés pour
// un compte déjà mort.
function badgeStatutAdmin(administrateur: Utilisateur) {
  if (estCompteSupprime(administrateur.telephone)) return { statut: "desactive", label: "Supprimé" };
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
  const [afficherSupprimes, setAfficherSupprimes] = useState(false);
  const [adminPourRole, setAdminPourRole] = useState<Utilisateur | null>(null);
  const [poleChoisi, setPoleChoisi] = useState<PoleAdmin>("operations");
  const [adminASupprimer, setAdminASupprimer] = useState<Utilisateur | null>(null);
  const [motifSuppression, setMotifSuppression] = useState("");

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

  const nombreSupprimes = useMemo(
    () => administrateurs.filter((a) => estCompteSupprime(a.telephone)).length,
    [administrateurs]
  );

  const administrateursAffiches = useMemo(
    () => administrateurs.filter((a) => afficherSupprimes || !estCompteSupprime(a.telephone)),
    [administrateurs, afficherSupprimes]
  );

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
    nouveauPole?: PoleAdmin
  ) {
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

  function ouvrirModificationRole(administrateur: Utilisateur) {
    setAdminPourRole(administrateur);
    setPoleChoisi(administrateur.poleAdmin ?? "operations");
  }

  async function confirmerModificationRole() {
    if (!adminPourRole) return;
    await executerAction(adminPourRole, "modifier_role", poleChoisi);
    setAdminPourRole(null);
  }

  // Réutilise la route de suppression de compte générique (déjà utilisée
  // pour clients/coursiers) : suppression réelle si aucun historique, sinon
  // anonymisation + bannissement définitif — le serveur réserve cette action
  // aux admins ciblant un autre admin au Super Admin (0046 + route
  // api/utilisateurs/[id]).
  async function confirmerSuppression() {
    if (!adminASupprimer) return;
    setActionEnCoursId(adminASupprimer.id);
    try {
      const resultat = await supprimerCompteUtilisateur(adminASupprimer.id, motifSuppression.trim() || undefined);
      if (resultat.mode === "suppression_definitive") {
        setAdministrateurs((prev) => prev.filter((a) => a.id !== adminASupprimer.id));
        window.alert(`Compte de ${adminASupprimer.nom} supprimé définitivement.`);
      } else if (resultat.utilisateur) {
        setAdministrateurs((prev) => prev.map((a) => (a.id === adminASupprimer.id ? resultat.utilisateur! : a)));
        window.alert(
          `Ce compte avait de l'historique : ses données personnelles ont été anonymisées et sa connexion bloquée définitivement.`
        );
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Impossible de supprimer ce compte.");
    } finally {
      setActionEnCoursId(null);
      setAdminASupprimer(null);
      setMotifSuppression("");
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
          <Select value={pole} onValueChange={(v) => setPole(v as PoleAdmin)}>
            <SelectTrigger className="h-auto rounded-md border-colimo-neutre-clair px-3 py-2 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLES_ADMIN.map((p) => (
                <SelectItem key={p.valeur} value={p.valeur}>
                  {p.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {nombreSupprimes > 0 && (
        <label className="mt-4 flex items-center gap-2 text-xs text-colimo-neutre-fonce/60">
          <input type="checkbox" checked={afficherSupprimes} onChange={(e) => setAfficherSupprimes(e.target.checked)} />
          Afficher les comptes supprimés ({nombreSupprimes})
        </label>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-colimo-neutre-clair bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-colimo-neutre-clair text-colimo-neutre-fonce/60">
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Pôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Invité par</TableHead>
              <TableHead>Depuis</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {administrateursAffiches.map((admin) => {
              const invitation = invitationParUtilisateur.get(admin.id);
              const estMoi = admin.id === monId;
              const supprime = estCompteSupprime(admin.telephone);
              const badge = badgeStatutAdmin(admin);
              const enCours = admin.statutInvitation === "en_cours";
              const confirme = admin.statutInvitation === "confirme";
              const actionEnCours = actionEnCoursId === admin.id;
              return (
                <TableRow key={admin.id} className="border-colimo-neutre-clair">
                  <TableCell className="font-medium text-colimo-neutre-fonce">
                    {admin.nom} {estMoi && <span className="text-xs text-colimo-neutre-fonce/40">(vous)</span>}
                  </TableCell>
                  <TableCell>{admin.telephone}</TableCell>
                  <TableCell className="text-xs text-colimo-neutre-fonce/70">
                    {admin.poleAdmin ? POLE_ADMIN_LABELS[admin.poleAdmin] : "—"}
                  </TableCell>
                  <TableCell>
                    <StatutBadge statut={badge.statut} label={badge.label} />
                  </TableCell>
                  <TableCell className="text-xs text-colimo-neutre-fonce/70">
                    {invitation ? (nomParId.get(invitation.invitePar) ?? "—") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-colimo-neutre-fonce/50">
                    {invitation ? new Date(invitation.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell>
                    {supprime ? (
                      <span className="text-xs text-colimo-neutre-fonce/40">Compte supprimé — aucune action possible</span>
                    ) : (
                      !estMoi && (
                      <div className="flex flex-wrap gap-2">
                        {enCours && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  disabled={actionEnCours}
                                  className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                                >
                                  Renvoyer l&apos;invitation
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Renvoyer l&apos;invitation ?</AlertDialogTitle>
                                  <AlertDialogDescription>Renvoyer l&apos;invitation à {admin.nom} ?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => executerAction(admin, "renvoyer_invitation")}>
                                    Renvoyer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  disabled={actionEnCours}
                                  className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-neutre-clair disabled:opacity-40"
                                >
                                  Annuler l&apos;invitation
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Annuler l&apos;invitation ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Annuler l&apos;invitation de {admin.nom} ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Retour</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => executerAction(admin, "annuler_invitation")}>
                                    Annuler l&apos;invitation
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                        {(confirme || enCours) && (
                          <button
                            disabled={actionEnCours}
                            onClick={() => ouvrirModificationRole(admin)}
                            className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                          >
                            Modifier le rôle
                          </button>
                        )}
                        {confirme && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                disabled={actionEnCours}
                                className="rounded-md border border-colimo-neutre-clair px-2.5 py-1 text-xs font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair disabled:opacity-40"
                              >
                                {admin.statut === "suspendu" ? "Réactiver" : "Suspendre"}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {admin.statut === "suspendu" ? "Réactiver" : "Suspendre"} cet accès ?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {admin.statut === "suspendu" ? "Réactiver" : "Suspendre"} l&apos;accès admin de{" "}
                                  {admin.nom} ?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    executerAction(admin, admin.statut === "suspendu" ? "reactiver" : "suspendre")
                                  }
                                >
                                  Confirmer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <button
                          disabled={actionEnCours}
                          onClick={() => setAdminASupprimer(admin)}
                          className="rounded-md border border-colimo-rouge/30 px-2.5 py-1 text-xs font-medium text-colimo-rouge hover:bg-colimo-rouge-clair disabled:opacity-40"
                        >
                          Supprimer
                        </button>
                      </div>
                      )
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!chargement && administrateursAffiches.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-colimo-neutre-fonce/50">
                  Aucun administrateur
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adminPourRole !== null} onOpenChange={(open) => !open && setAdminPourRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le pôle de {adminPourRole?.nom}</DialogTitle>
          </DialogHeader>
          <Select value={poleChoisi} onValueChange={(v) => setPoleChoisi(v as PoleAdmin)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POLES_ADMIN.map((p) => (
                <SelectItem key={p.valeur} value={p.valeur}>
                  {p.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <button
              onClick={() => setAdminPourRole(null)}
              className="rounded-md border border-colimo-neutre-clair px-3 py-1.5 text-sm font-medium text-colimo-neutre-fonce hover:bg-colimo-neutre-clair"
            >
              Annuler
            </button>
            <button
              onClick={confirmerModificationRole}
              className="rounded-md bg-colimo-rouge px-3 py-1.5 text-sm font-medium text-white hover:bg-colimo-rouge-fonce"
            >
              Changer le pôle
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={adminASupprimer !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdminASupprimer(null);
            setMotifSuppression("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement le compte de {adminASupprimer?.nom} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-colimo-neutre-fonce/70">
            Si ce compte n&apos;a aucun historique d&apos;actions, il sera supprimé définitivement. S&apos;il a de
            l&apos;historique (invitations envoyées, actions journalisées...), ses données personnelles seront
            anonymisées et sa connexion bloquée définitivement. Cette action est irréversible.
          </p>
          <Input
            value={motifSuppression}
            onChange={(e) => setMotifSuppression(e.target.value)}
            placeholder="Motif de la suppression (optionnel)"
          />
          <DialogFooter>
            <button
              onClick={() => setAdminASupprimer(null)}
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
