export type RoleCommerceMembre = "administrateur" | "responsable" | "employe";

export const ROLE_COMMERCE_MEMBRE_LABELS: Record<RoleCommerceMembre, string> = {
  administrateur: "Administrateur du commerce",
  responsable: "Responsable",
  employe: "Employé",
};

export interface CommerceMembre {
  id: string;
  commerceId: string;
  utilisateurId: string;
  role: RoleCommerceMembre;
  invitePar: string | null;
  createdAt: string;
}

export interface InvitationCommerce {
  id: string;
  commerceId: string;
  code: string;
  role: RoleCommerceMembre;
  creePar: string;
  utiliseParId: string | null;
  expireLe: string;
  createdAt: string;
}
