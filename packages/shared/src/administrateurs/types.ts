export interface HistoriqueInvitationAdmin {
  id: string;
  utilisateurId: string;
  nom: string;
  email: string;
  invitePar: string;
  createdAt: string;
}

// Journal d'audit des actions d'administration (invitation, changement de
// rôle, suspension/réactivation, annulation d'invitation...).
export type ActionAdmin =
  | "invitation_creee"
  | "invitation_renvoyee"
  | "invitation_annulee"
  | "role_modifie"
  | "acces_suspendu"
  | "acces_reactive"
  | "compte_supprime";

export const ACTION_ADMIN_LABELS: Record<ActionAdmin, string> = {
  invitation_creee: "Invitation créée",
  invitation_renvoyee: "Invitation renvoyée",
  invitation_annulee: "Invitation annulée",
  role_modifie: "Rôle modifié",
  acces_suspendu: "Accès suspendu",
  acces_reactive: "Accès réactivé",
  compte_supprime: "Compte supprimé",
};

export interface HistoriqueActionAdmin {
  id: string;
  administrateurId: string;
  action: ActionAdmin;
  cibleId: string | null;
  details: Record<string, unknown> | null;
  resultat: "succes" | "echec";
  createdAt: string;
}
