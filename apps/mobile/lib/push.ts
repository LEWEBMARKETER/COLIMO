// Notifications push web (PWA) — Service Worker + Web Push standard (clés
// VAPID), pas de service tiers propriétaire. S'ajoute au canal "push" déjà
// utilisé par le Communication Center (in-app), sans le remplacer : cf.
// docs/NOTIFICATIONS_PUSH.md.
import { enregistrerAbonnementPush } from "@colimo/shared";
import { supabase } from "./supabaseClient";

export function notificationsPushDisponibles(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const donneesBrutes = atob(base64);
  const tableau = new Uint8Array(donneesBrutes.length);
  for (let i = 0; i < donneesBrutes.length; i++) tableau[i] = donneesBrutes.charCodeAt(i);
  return tableau;
}

// Demande la permission, enregistre le service worker, s'abonne au push et
// persiste l'abonnement — n'appeler qu'à l'initiative de l'utilisateur
// (bouton "Activer les notifications"), jamais automatiquement au chargement
// d'une page (Notification.requestPermission() doit rester un geste explicite).
export async function activerNotificationsPush(utilisateurId: string): Promise<boolean> {
  if (!notificationsPushDisponibles()) return false;

  const vapidKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    await enregistrerAbonnementPush(supabase, {
      utilisateurId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
    return true;
  } catch {
    return false;
  }
}
