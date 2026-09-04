import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { PositionCoursierRow } from "../supabase/mappers";
import { positionCoursierFromRow } from "../supabase/mappers";
import { distanceKm } from "../maps";
import type { PositionCoursier } from "../types";
import { DEPLACEMENT_MIN_RECALCUL_ETA_M, INTERVALLE_MAX_RECALCUL_ETA_MS, INTERVALLE_MIN_RECALCUL_ETA_MS } from "./types";

export * from "./types";

// Écrase la position du coursier (une seule ligne par coursier, jamais un
// historique) — n'appeler que pendant une course active, cf.
// apps/mobile/app/(coursier)/course/[id].tsx. RLS (0038) limite l'écriture
// à coursier_id = auth.uid().
export async function upsertPositionCoursier(
  client: SupabaseClient,
  position: {
    coursierId: string;
    latitude: number;
    longitude: number;
    precisionM?: number | null;
    vitesseKmh?: number | null;
    capDegres?: number | null;
  }
): Promise<PositionCoursier> {
  const { data, error } = await client
    .from("positions_coursiers")
    .upsert(
      {
        coursier_id: position.coursierId,
        latitude: position.latitude,
        longitude: position.longitude,
        precision_m: position.precisionM ?? null,
        vitesse_kmh: position.vitesseKmh ?? null,
        cap_degres: position.capDegres ?? null,
        maj_at: new Date().toISOString(),
      },
      { onConflict: "coursier_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return positionCoursierFromRow(data as PositionCoursierRow);
}

export async function getPositionCoursier(client: SupabaseClient, coursierId: string): Promise<PositionCoursier | null> {
  const { data, error } = await client
    .from("positions_coursiers")
    .select("*")
    .eq("coursier_id", coursierId)
    .maybeSingle();
  if (error) throw error;
  return data ? positionCoursierFromRow(data as PositionCoursierRow) : null;
}

// Abonnement Realtime à la position d'UN coursier — réservé aux sessions
// authentifiées (client avec course active, coursier lui-même, ou admin) :
// la RLS de positions_coursiers s'applique aussi aux souscriptions
// postgres_changes, pas seulement aux requêtes REST classiques. Le
// destinataire public (sans compte) continue de recevoir la position via
// le polling déjà en place de get_course_suivi_public, pas ce canal.
// L'appelant est responsable de client.removeChannel(channel) au démontage.
export function souscrirePositionCoursier(
  client: SupabaseClient,
  coursierId: string,
  surMaj: (position: PositionCoursier) => void
): RealtimeChannel {
  return client
    .channel(`position-coursier-${coursierId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "positions_coursiers", filter: `coursier_id=eq.${coursierId}` },
      (payload) => {
        if (payload.new && Object.keys(payload.new).length > 0) {
          surMaj(positionCoursierFromRow(payload.new as PositionCoursierRow));
        }
      }
    )
    .subscribe();
}

// Toutes les positions courantes — réservé à l'admin (RLS 0038), utilisé
// par la carte live du back-office.
export async function getPositionsCoursiers(client: SupabaseClient): Promise<PositionCoursier[]> {
  const { data, error } = await client.from("positions_coursiers").select("*");
  if (error) throw error;
  return (data as PositionCoursierRow[]).map(positionCoursierFromRow);
}

// Abonnement Realtime à TOUTES les positions (sans filtre par coursier) —
// réservé à l'admin, pour la carte live du back-office. L'appelant est
// responsable de client.removeChannel(channel) au démontage.
export function souscrireToutesPositionsCoursiers(
  client: SupabaseClient,
  surMaj: (position: PositionCoursier) => void
): RealtimeChannel {
  return client
    .channel("positions-coursiers-admin")
    .on("postgres_changes", { event: "*", schema: "public", table: "positions_coursiers" }, (payload) => {
      if (payload.new && Object.keys(payload.new).length > 0) {
        surMaj(positionCoursierFromRow(payload.new as PositionCoursierRow));
      }
    })
    .subscribe();
}

// Décide si l'ETA/distance doit être recalculée (appel Mapbox Directions,
// payant) à partir de la dernière position ayant servi de base au calcul —
// jamais à chaque position GPS reçue. Utilisée à la fois côté app (pour
// éviter un appel réseau inutile) et côté fonction serveur (contrôle
// autoritaire, un client ne peut pas contourner la règle en appelant
// directement l'API) — cf. packages/shared/src/positions/types.ts pour les
// seuils.
export function doitRecalculerEta(params: {
  dernierCalculAt: string | null;
  dernierLat: number | null;
  dernierLng: number | null;
  latitude: number;
  longitude: number;
}): boolean {
  if (!params.dernierCalculAt || params.dernierLat == null || params.dernierLng == null) return true;

  const ecouleMs = Date.now() - new Date(params.dernierCalculAt).getTime();
  if (ecouleMs < INTERVALLE_MIN_RECALCUL_ETA_MS) return false;
  if (ecouleMs >= INTERVALLE_MAX_RECALCUL_ETA_MS) return true;

  const distanceM =
    distanceKm(
      { latitude: params.dernierLat, longitude: params.dernierLng },
      { latitude: params.latitude, longitude: params.longitude }
    ) * 1000;
  return distanceM >= DEPLACEMENT_MIN_RECALCUL_ETA_M;
}
