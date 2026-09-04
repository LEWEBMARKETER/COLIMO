// Seuils de throttle partagés entre l'app coursier (évite un appel réseau
// inutile) et la fonction serveur (application autoritaire de la même
// règle, jamais confiée uniquement au client) — cf. doitRecalculerEta.
export const INTERVALLE_MIN_RECALCUL_ETA_MS = 10_000;
export const INTERVALLE_MAX_RECALCUL_ETA_MS = 45_000;
export const DEPLACEMENT_MIN_RECALCUL_ETA_M = 200;

// Cible d'envoi de la position GPS par le coursier : toutes les 5 à 15
// secondes, ou plus tôt en cas de déplacement significatif — cf.
// apps/mobile watchPositionAsync({ timeInterval, distanceInterval }).
export const INTERVALLE_ENVOI_POSITION_MS = 12_000;
export const DEPLACEMENT_MIN_ENVOI_POSITION_M = 30;
