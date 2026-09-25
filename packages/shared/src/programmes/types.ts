// Module générique « Programmes » — un programme peut cibler les
// commerçants, les coursiers, les particuliers ou tout le monde. Le premier
// programme (100 Commerces Partenaires) n'est qu'une ligne de données ;
// rien ici n'est spécifique à cette campagne. Prévu pour accueillir plus
// tard codes promo/récompenses/paliers/parrainage (non développés
// aujourd'hui) sans reconstruire ce module.

export type ProgramTargetType = "merchant" | "courier" | "customer" | "all";

export const PROGRAM_TARGET_TYPE_LABELS: Record<ProgramTargetType, string> = {
  merchant: "Commerces",
  courier: "Coursiers",
  customer: "Particuliers",
  all: "Tous",
};

export type ProgramStatus = "draft" | "active" | "closed" | "archived";

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Clos",
  archived: "Archivé",
};

export type ProgramParticipantStatus = "pending" | "approved" | "rejected";

export const PROGRAM_PARTICIPANT_STATUS_LABELS: Record<ProgramParticipantStatus, string> = {
  pending: "En attente",
  approved: "Accepté",
  rejected: "Refusé",
};

export interface Program {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  targetType: ProgramTargetType;
  // Contenu configurable (jamais codé en dur dans l'interface) — liste de
  // courtes phrases affichées telles quelles.
  benefits: string[];
  maxParticipants: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ProgramStatus;
  createdAt: string;
  updatedAt: string;
}

// Un programme enrichi du décompte de participants acceptés — c'est ce
// décompte, jamais le nombre brut de candidatures, qui détermine les places
// restantes et l'état "complet".
export interface ProgramAvecStats extends Program {
  participantsAcceptes: number;
  participantsEnAttente: number;
  placesRestantes: number | null;
  complet: boolean;
}

export interface ProgramParticipant {
  id: string;
  programId: string;
  userId: string;
  status: ProgramParticipantStatus;
  appliedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface ProgramParticipantAvecUtilisateur extends ProgramParticipant {
  utilisateur: {
    nom: string;
    prenom: string | null;
    telephone: string;
  } | null;
}

export function calculerStatsProgramme(programme: Program, participants: ProgramParticipant[]): ProgramAvecStats {
  const participantsAcceptes = participants.filter((p) => p.status === "approved").length;
  const participantsEnAttente = participants.filter((p) => p.status === "pending").length;
  const placesRestantes = programme.maxParticipants === null ? null : Math.max(programme.maxParticipants - participantsAcceptes, 0);
  return {
    ...programme,
    participantsAcceptes,
    participantsEnAttente,
    placesRestantes,
    complet: placesRestantes === 0,
  };
}
