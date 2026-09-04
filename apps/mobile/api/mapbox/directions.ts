// Fonction serverless Vercel (déployée avec le reste de apps/mobile, même
// origine que colimo.online — aucun souci de CORS). Seul endroit du projet
// qui connaît la clé Mapbox secrète (MAPBOX_SECRET_TOKEN, variable
// d'environnement Vercel côté serveur, jamais préfixée EXPO_PUBLIC_) : elle
// n'atteint donc jamais le frontend, conformément à la consigne "aucune clé
// secrète dans le frontend".
//
// Écrit volontairement sans dépendre de @vercel/node (non installé dans ce
// monorepo) : les formes ci-dessous couvrent exactement ce que Vercel
// fournit à une fonction Node (req.body déjà parsé en JSON, req.headers,
// res.status().json()).
import { createClient } from "@supabase/supabase-js";
import { courseFromRow, distanceKm, doitRecalculerEta, tempsEstimeMinutes } from "@colimo/shared";

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

const STATUTS_AVEC_ETA = new Set(["acceptee", "retrait", "en_cours"]);

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ erreur: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    res.status(500).json({ erreur: "Configuration serveur incomplète (variables Supabase manquantes)." });
    return;
  }

  const body = (req.body ?? {}) as { courseId?: string };
  const courseId = typeof body.courseId === "string" ? body.courseId : null;
  if (!courseId) {
    res.status(400).json({ erreur: "courseId requis." });
    return;
  }

  const enteteAuth = req.headers.authorization;
  const jeton = typeof enteteAuth === "string" ? enteteAuth.replace(/^Bearer\s+/i, "") : null;
  if (!jeton) {
    res.status(401).json({ erreur: "Authentification requise." });
    return;
  }

  const clientAuth = createClient(supabaseUrl, supabaseAnonKey);
  const { data: utilisateurAuth, error: erreurAuth } = await clientAuth.auth.getUser(jeton);
  if (erreurAuth || !utilisateurAuth.user) {
    res.status(401).json({ erreur: "Session invalide ou expirée." });
    return;
  }
  const utilisateurId = utilisateurAuth.user.id;

  // Clé service role : contourne la RLS pour lire/mettre à jour la course
  // et incrémenter le compteur d'usage — jamais transmise au client.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: courseRow, error: erreurCourse } = await serviceClient
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();
  if (erreurCourse || !courseRow) {
    res.status(404).json({ erreur: "Course introuvable." });
    return;
  }

  const estPartiePrenante = courseRow.client_id === utilisateurId || courseRow.coursier_id === utilisateurId;
  if (!estPartiePrenante) {
    const { data: profil } = await serviceClient.from("utilisateurs").select("type").eq("id", utilisateurId).maybeSingle();
    if (profil?.type !== "admin") {
      res.status(403).json({ erreur: "Accès refusé à cette course." });
      return;
    }
  }

  // Rien à calculer : pas encore de coursier assigné, ou course terminée —
  // on renvoie l'état actuel sans solliciter Mapbox.
  if (!STATUTS_AVEC_ETA.has(courseRow.statut) || !courseRow.coursier_id) {
    res.status(200).json({ course: courseFromRow(courseRow) });
    return;
  }

  const { data: positionRow } = await serviceClient
    .from("positions_coursiers")
    .select("*")
    .eq("coursier_id", courseRow.coursier_id)
    .maybeSingle();
  if (!positionRow) {
    res.status(200).json({ course: courseFromRow(courseRow) });
    return;
  }

  // Avant "retrait" (colis récupéré), le coursier se dirige vers le point de
  // récupération ; à partir de "retrait" et pendant "en_cours", vers la
  // destination finale.
  const destination =
    courseRow.statut === "acceptee"
      ? { latitude: courseRow.latitude_depart, longitude: courseRow.longitude_depart }
      : { latitude: courseRow.latitude_arrivee, longitude: courseRow.longitude_arrivee };
  if (destination.latitude == null || destination.longitude == null) {
    res.status(200).json({ course: courseFromRow(courseRow) });
    return;
  }

  const origine = { latitude: positionRow.latitude as number, longitude: positionRow.longitude as number };

  // Throttle autoritaire : un appel fréquent à cet endpoint (à chaque
  // position GPS) ne déclenche pas systématiquement un appel Mapbox
  // Directions payant — cf. packages/shared/src/positions.
  const recalculNecessaire = doitRecalculerEta({
    dernierCalculAt: courseRow.eta_calcule_at,
    dernierLat: courseRow.eta_calcule_lat,
    dernierLng: courseRow.eta_calcule_lng,
    latitude: origine.latitude,
    longitude: origine.longitude,
  });
  if (!recalculNecessaire) {
    res.status(200).json({ course: courseFromRow(courseRow) });
    return;
  }

  const mapboxToken = process.env.MAPBOX_SECRET_TOKEN;
  let distanceM: number;
  let etaSecondes: number;
  let source: "mapbox" | "estimation";

  try {
    if (!mapboxToken) throw new Error("MAPBOX_SECRET_TOKEN non configuré");
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${origine.longitude},${origine.latitude};${destination.longitude},${destination.latitude}` +
      `?overview=false&access_token=${mapboxToken}`;
    const reponseMapbox = await fetch(url);
    if (!reponseMapbox.ok) throw new Error(`Mapbox Directions a répondu ${reponseMapbox.status}`);
    const donnees = (await reponseMapbox.json()) as { routes?: { distance: number; duration: number }[] };
    const route = donnees.routes?.[0];
    if (!route) throw new Error("Aucun itinéraire Mapbox trouvé");
    distanceM = route.distance;
    etaSecondes = Math.round(route.duration);
    source = "mapbox";
    await serviceClient.rpc("incrementer_usage_mapbox", { p_type: "directions" });
  } catch {
    // Mode dégradé : distance à vol d'oiseau + vitesse moyenne urbaine
    // (packages/shared/src/maps — indépendant de tout service externe).
    const km = distanceKm(origine, destination);
    distanceM = km * 1000;
    etaSecondes = tempsEstimeMinutes(km) * 60;
    source = "estimation";
  }

  const { data: courseMiseAJour, error: erreurUpdate } = await serviceClient
    .from("courses")
    .update({
      distance_restante_m: distanceM,
      eta_secondes: etaSecondes,
      eta_calcule_at: new Date().toISOString(),
      eta_calcule_lat: origine.latitude,
      eta_calcule_lng: origine.longitude,
      eta_source: source,
    })
    .eq("id", courseId)
    .select()
    .single();

  if (erreurUpdate || !courseMiseAJour) {
    res.status(500).json({ erreur: "Impossible d'enregistrer le calcul du trajet." });
    return;
  }

  res.status(200).json({ course: courseFromRow(courseMiseAJour) });
}
