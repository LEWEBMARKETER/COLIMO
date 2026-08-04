import type { SupabaseClient } from "@supabase/supabase-js";
import { codeOtpFromRow, type CodeOtpRow } from "../supabase/mappers";
import { envoyerCommunication } from "../communication/service";
import type { CodeOtp, ObjectifOtp } from "./types";

const DUREE_VALIDITE_MINUTES_DEFAUT = 5;

function genererCodeAleatoire(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Génère un code OTP, l'enregistre, et l'envoie via le module Notifications
// (canal SMS, modèle "sms_otp"). Le fournisseur SMS n'est pas connecté à ce
// stade (fournisseur mock) : cette fonction n'est appelée nulle part dans le
// flux d'authentification actuel, elle est prête à l'être.
export async function genererOtp(
  client: SupabaseClient,
  input: {
    destinataire: string;
    objectif: ObjectifOtp;
    utilisateurId?: string;
    declenchePar: string;
    dureeMinutes?: number;
  }
): Promise<CodeOtp> {
  const dureeMinutes = input.dureeMinutes ?? DUREE_VALIDITE_MINUTES_DEFAUT;
  const code = genererCodeAleatoire();
  const expireAt = new Date(Date.now() + dureeMinutes * 60_000).toISOString();

  const { data, error } = await client
    .from("codes_otp")
    .insert({
      utilisateur_id: input.utilisateurId ?? null,
      destinataire: input.destinataire,
      code,
      objectif: input.objectif,
      expire_at: expireAt,
    })
    .select()
    .single();
  if (error) throw error;

  await envoyerCommunication(client, {
    declenchePar: input.declenchePar,
    utilisateurId: input.utilisateurId,
    canal: "sms",
    destinataire: input.destinataire,
    modeleCode: "sms_otp",
    variables: { otp: code, minutes: String(dureeMinutes) },
  });

  return codeOtpFromRow(data as CodeOtpRow);
}

// Vérifie un code saisi par l'utilisateur : doit exister, correspondre au
// destinataire et à l'objectif, ne pas être expiré, ne pas avoir déjà été
// utilisé. Marque le code comme utilisé en cas de succès (usage unique).
export async function verifierOtp(
  client: SupabaseClient,
  input: { destinataire: string; code: string; objectif: ObjectifOtp }
): Promise<boolean> {
  const { data, error } = await client
    .from("codes_otp")
    .select("*")
    .eq("destinataire", input.destinataire)
    .eq("code", input.code)
    .eq("objectif", input.objectif)
    .eq("utilise", false)
    .gte("expire_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  const { error: updateError } = await client.from("codes_otp").update({ utilise: true }).eq("id", data.id);
  if (updateError) throw updateError;

  return true;
}
