// Service Worker minimal pour les notifications push web (PWA) — n'a
// volontairement aucun rôle de cache/offline, uniquement l'affichage des
// notifications reçues et la navigation au clic. Servi à la racine du site
// (copié depuis public/ par l'export web Expo), enregistré depuis
// apps/mobile/lib/push.ts.

self.addEventListener("push", (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = { contenu: event.data ? event.data.text() : "" };
  }

  const titre = donnees.titre || "COLIMO";
  const options = {
    body: donnees.contenu || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: donnees.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
