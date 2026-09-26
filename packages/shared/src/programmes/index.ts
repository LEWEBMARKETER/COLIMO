import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Program,
  ProgramParticipant,
  ProgramParticipantAvecUtilisateur,
  ProgramParticipantStatus,
  ProgramStatus,
  ProgramTargetType,
} from "./types";

export * from "./types";

interface ProgramRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  target_type: ProgramTargetType;
  benefits: string[];
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  status: ProgramStatus;
  created_at: string;
  updated_at: string;
}

interface ProgramParticipantRow {
  id: string;
  program_id: string;
  user_id: string;
  status: ProgramParticipantStatus;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface ProgramParticipantAvecUtilisateurRow extends ProgramParticipantRow {
  utilisateur: { nom: string; prenom: string | null; telephone: string } | null;
}

function programFromRow(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    targetType: row.target_type,
    benefits: row.benefits ?? [],
    maxParticipants: row.max_participants,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function programParticipantFromRow(row: ProgramParticipantRow): ProgramParticipant {
  return {
    id: row.id,
    programId: row.program_id,
    userId: row.user_id,
    status: row.status,
    appliedAt: row.applied_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

function programParticipantAvecUtilisateurFromRow(row: ProgramParticipantAvecUtilisateurRow): ProgramParticipantAvecUtilisateur {
  return { ...programParticipantFromRow(row), utilisateur: row.utilisateur };
}

// La RLS (programs_select_admin_or_eligible, migration 0050) filtre déjà
// selon l'éligibilité : un admin voit tout, un autre utilisateur ne voit
// que les programmes publiés auxquels il est éligible. Aucun filtrage
// supplémentaire à faire côté client.
export async function getProgrammes(client: SupabaseClient, params?: { status?: ProgramStatus }): Promise<Program[]> {
  let requete = client.from("programs").select("*").order("created_at", { ascending: false });
  if (params?.status) requete = requete.eq("status", params.status);
  const { data, error } = await requete;
  if (error) throw error;
  return (data as ProgramRow[]).map(programFromRow);
}

export async function getProgramme(client: SupabaseClient, id: string): Promise<Program | null> {
  const { data, error } = await client.from("programs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? programFromRow(data as ProgramRow) : null;
}

export async function creerProgramme(
  client: SupabaseClient,
  input: {
    name: string;
    slug: string;
    description?: string;
    targetType: ProgramTargetType;
    benefits: string[];
    maxParticipants?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }
): Promise<Program> {
  const { data, error } = await client
    .from("programs")
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      target_type: input.targetType,
      benefits: input.benefits,
      max_participants: input.maxParticipants ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return programFromRow(data as ProgramRow);
}

export async function patchProgramme(
  client: SupabaseClient,
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    targetType: ProgramTargetType;
    benefits: string[];
    maxParticipants: number | null;
    startDate: string | null;
    endDate: string | null;
    status: ProgramStatus;
  }>
): Promise<Program> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.targetType !== undefined) update.target_type = patch.targetType;
  if (patch.benefits !== undefined) update.benefits = patch.benefits;
  if (patch.maxParticipants !== undefined) update.max_participants = patch.maxParticipants;
  if (patch.startDate !== undefined) update.start_date = patch.startDate;
  if (patch.endDate !== undefined) update.end_date = patch.endDate;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await client.from("programs").update(update).eq("id", id).select().single();
  if (error) throw error;
  return programFromRow(data as ProgramRow);
}

export async function getParticipantsProgramme(
  client: SupabaseClient,
  programId: string,
  params?: { status?: ProgramParticipantStatus }
): Promise<ProgramParticipantAvecUtilisateur[]> {
  let requete = client
    .from("program_participants")
    // program_participants a deux FK vers utilisateurs (user_id, reviewed_by)
    // — sans préciser laquelle, PostgREST refuse l'embed (ambigu, PGRST201).
    .select("*, utilisateur:utilisateurs!user_id(nom, prenom, telephone)")
    .eq("program_id", programId)
    .order("applied_at", { ascending: false });
  if (params?.status) requete = requete.eq("status", params.status);

  const { data, error } = await requete;
  if (error) throw error;
  return (data as ProgramParticipantAvecUtilisateurRow[]).map(programParticipantAvecUtilisateurFromRow);
}

// Décompte agrégé (participants acceptés / places restantes) via la RPC
// compteur_participants_programme — c'est la seule façon pour un non-admin
// de connaître ce chiffre : la RLS de program_participants ne laisse lire
// que ses propres candidatures, jamais la liste complète.
export async function getCompteurProgramme(
  client: SupabaseClient,
  programId: string
): Promise<{ participantsAcceptes: number; placesRestantes: number | null }> {
  const { data, error } = await client.rpc("compteur_participants_programme", { p_program_id: programId }).single();
  if (error) throw error;
  const row = data as { participants_acceptes: number; places_restantes: number | null };
  return { participantsAcceptes: row.participants_acceptes, placesRestantes: row.places_restantes };
}

// Candidature de l'utilisateur courant à un programme donné (au plus une,
// contrainte unique program_id+user_id) — la RLS restreint déjà la lecture
// à ses propres candidatures.
export async function getMaCandidatureProgramme(client: SupabaseClient, programId: string): Promise<ProgramParticipant | null> {
  const { data, error } = await client
    .from("program_participants")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();
  if (error) throw error;
  return data ? programParticipantFromRow(data as ProgramParticipantRow) : null;
}

// Passe par la RPC candidater_programme (security definer) : elle seule
// vérifie l'éligibilité, le statut actif du programme et le nombre de
// places restantes avant d'insérer — aucune policy insert n'existe sur
// program_participants pour les utilisateurs non-admin.
export async function candidaterProgramme(client: SupabaseClient, programId: string): Promise<ProgramParticipant> {
  const { data, error } = await client.rpc("candidater_programme", { p_program_id: programId }).single();
  if (error) throw error;
  return programParticipantFromRow(data as ProgramParticipantRow);
}

// Admin uniquement — passe par la RPC traiter_candidature_programme, qui
// revérifie le nombre de places disponibles au moment de l'acceptation.
export async function traiterCandidatureProgramme(
  client: SupabaseClient,
  participantId: string,
  decision: "approved" | "rejected"
): Promise<ProgramParticipant> {
  const { data, error } = await client
    .rpc("traiter_candidature_programme", { p_participant_id: participantId, p_decision: decision })
    .single();
  if (error) throw error;
  return programParticipantFromRow(data as ProgramParticipantRow);
}
