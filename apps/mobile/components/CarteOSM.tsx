import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import type { Coordonnees } from "@colimo/shared";

export interface PointCarte {
  id: string;
  coordonnees: Coordonnees;
  couleur: string;
  label?: string;
}

interface CarteOSMProps {
  points: PointCarte[];
  pointDeplacableId?: string;
  trace?: Coordonnees[];
  hauteur?: number;
  zoomInitial?: number;
  onDeplacerPoint?: (coordonnees: Coordonnees) => void;
  // Point mis à jour fréquemment (position live d'un coursier pendant une
  // course active) : appliqué par injection JS ciblée sur le marqueur
  // existant plutôt que par un rechargement complet de la carte, pour ne
  // pas réinitialiser le zoom/pan choisi par l'utilisateur à chaque tick.
  pointLive?: PointCarte | null;
}

const LIBREVILLE: Coordonnees = { latitude: 0.4162, longitude: 9.4673 };

// Moteur de carte prioritaire : Mapbox GL JS (rendu vectoriel, tuiles
// Mapbox) si un token public est configuré. Sans token, ou si le script
// Mapbox échoue à se charger en conditions réelles (CDN inaccessible,
// token invalide), on retombe sur Leaflet/OpenStreetMap — gratuit, sans
// clé, déjà utilisé partout dans l'app avant cette fonctionnalité — pour
// que la carte reste toujours utilisable ("mode dégradé").
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

function calculerCentre(points: PointCarte[]): Coordonnees {
  if (points.length === 0) return LIBREVILLE;
  const latitude = points.reduce((total, p) => total + p.coordonnees.latitude, 0) / points.length;
  const longitude = points.reduce((total, p) => total + p.coordonnees.longitude, 0) / points.length;
  return { latitude, longitude };
}

interface DonneesCarte {
  points: PointCarte[];
  trace: Coordonnees[];
  pointDeplacableId: string | null;
  pointLive: PointCarte | null;
  centre: Coordonnees;
  zoom: number;
}

// Contrat JS commun aux deux moteurs, appelé depuis React via
// injectJavaScript : window.majPointLive(payload | null) crée, déplace ou
// retire le marqueur "live" sans toucher au reste de la carte.
function scriptPartageEnvoiMessage(): string {
  return `
  function envoyerMessage(message) {
    var texte = JSON.stringify(message);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(texte);
    }
    if (window.parent) {
      window.parent.postMessage(texte, "*");
    }
  }`;
}

function construireHtmlLeaflet(donnees: DonneesCarte): string {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #carte { height: 100%; margin: 0; padding: 0; background: #FAF8F5; }
</style>
</head>
<body>
<div id="carte"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var DONNEES = ${json};
  ${scriptPartageEnvoiMessage()}

  function icone(couleur) {
    return L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:50%;background:' + couleur +
        ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  var carte = L.map("carte", { zoomControl: true }).setView(
    [DONNEES.centre.latitude, DONNEES.centre.longitude],
    DONNEES.zoom
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; contributeurs OpenStreetMap",
  }).addTo(carte);

  var marqueurs = {};
  DONNEES.points.forEach(function (point) {
    var deplacable = point.id === DONNEES.pointDeplacableId;
    var marqueur = L.marker([point.coordonnees.latitude, point.coordonnees.longitude], {
      icon: icone(point.couleur),
      draggable: deplacable,
    }).addTo(carte);
    if (point.label) marqueur.bindTooltip(point.label, { direction: "top", offset: [0, -10] });
    if (deplacable) {
      marqueur.on("dragend", function (e) {
        var position = e.target.getLatLng();
        envoyerMessage({ type: "deplacer", latitude: position.lat, longitude: position.lng });
      });
    }
    marqueurs[point.id] = marqueur;
  });

  if (DONNEES.trace && DONNEES.trace.length > 1) {
    var latlngs = DONNEES.trace.map(function (p) { return [p.latitude, p.longitude]; });
    L.polyline(latlngs, { color: "#C41E24", weight: 4, opacity: 0.7 }).addTo(carte);
  }

  var marqueurLive = null;
  window.majPointLive = function (point) {
    if (!point) {
      if (marqueurLive) { carte.removeLayer(marqueurLive); marqueurLive = null; }
      return;
    }
    if (marqueurLive) {
      marqueurLive.setLatLng([point.coordonnees.latitude, point.coordonnees.longitude]);
    } else {
      marqueurLive = L.marker([point.coordonnees.latitude, point.coordonnees.longitude], {
        icon: icone(point.couleur),
      }).addTo(carte);
      if (point.label) marqueurLive.bindTooltip(point.label, { direction: "top", offset: [0, -10] });
    }
  };
  if (DONNEES.pointLive) window.majPointLive(DONNEES.pointLive);

  var listeMarqueurs = Object.keys(marqueurs).map(function (id) { return marqueurs[id]; });
  if (marqueurLive) listeMarqueurs.push(marqueurLive);
  if (listeMarqueurs.length > 1) {
    var groupe = L.featureGroup(listeMarqueurs);
    carte.fitBounds(groupe.getBounds().pad(0.35));
  }

  if (DONNEES.pointDeplacableId) {
    carte.on("click", function (e) {
      var marqueur = marqueurs[DONNEES.pointDeplacableId];
      if (marqueur) {
        marqueur.setLatLng(e.latlng);
        envoyerMessage({ type: "deplacer", latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    });
  }
})();
</script>
</body>
</html>`;
}

function construireHtmlMapbox(donnees: DonneesCarte, token: string): string {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" />
<style>
  html, body, #carte { height: 100%; margin: 0; padding: 0; background: #FAF8F5; }
</style>
</head>
<body>
<div id="carte"></div>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
<script>
(function () {
  var DONNEES = ${json};
  ${scriptPartageEnvoiMessage()}

  // Filet de sécurité : le script Mapbox GL n'a pas pu se charger (réseau,
  // CDN bloqué, token invalide en amont) — on prévient React qui retombe
  // alors sur Leaflet/OSM pour le reste de la session.
  if (typeof mapboxgl === "undefined") {
    envoyerMessage({ type: "secours" });
  } else {
  mapboxgl.accessToken = ${JSON.stringify(token)};

  function elementPoint(couleur) {
    var el = document.createElement("div");
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.borderRadius = "50%";
    el.style.background = couleur;
    el.style.border = "2px solid white";
    el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.45)";
    return el;
  }

  var carte = new mapboxgl.Map({
    container: "carte",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [DONNEES.centre.longitude, DONNEES.centre.latitude],
    zoom: DONNEES.zoom,
  });
  carte.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  carte.on("error", function () { envoyerMessage({ type: "secours" }); });

  carte.on("load", function () {
    var marqueurs = {};
    DONNEES.points.forEach(function (point) {
      var deplacable = point.id === DONNEES.pointDeplacableId;
      var marqueur = new mapboxgl.Marker({ element: elementPoint(point.couleur), draggable: deplacable })
        .setLngLat([point.coordonnees.longitude, point.coordonnees.latitude])
        .addTo(carte);
      if (point.label) marqueur.setPopup(new mapboxgl.Popup({ closeButton: false, offset: 14 }).setText(point.label));
      if (deplacable) {
        marqueur.on("dragend", function () {
          var position = marqueur.getLngLat();
          envoyerMessage({ type: "deplacer", latitude: position.lat, longitude: position.lng });
        });
      }
      marqueurs[point.id] = marqueur;
    });

    if (DONNEES.trace && DONNEES.trace.length > 1) {
      carte.addSource("trace", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: DONNEES.trace.map(function (p) { return [p.longitude, p.latitude]; }) },
        },
      });
      carte.addLayer({
        id: "trace",
        type: "line",
        source: "trace",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#C41E24", "line-width": 4, "line-opacity": 0.7 },
      });
    }

    var marqueurLive = null;
    window.majPointLive = function (point) {
      if (!point) {
        if (marqueurLive) { marqueurLive.remove(); marqueurLive = null; }
        return;
      }
      if (marqueurLive) {
        marqueurLive.setLngLat([point.coordonnees.longitude, point.coordonnees.latitude]);
      } else {
        marqueurLive = new mapboxgl.Marker({ element: elementPoint(point.couleur) })
          .setLngLat([point.coordonnees.longitude, point.coordonnees.latitude])
          .addTo(carte);
        if (point.label) marqueurLive.setPopup(new mapboxgl.Popup({ closeButton: false, offset: 14 }).setText(point.label));
      }
    };
    if (DONNEES.pointLive) window.majPointLive(DONNEES.pointLive);

    var tousPoints = DONNEES.points.slice();
    if (DONNEES.pointLive) tousPoints.push(DONNEES.pointLive);
    if (tousPoints.length > 1) {
      var bounds = new mapboxgl.LngLatBounds();
      tousPoints.forEach(function (p) { bounds.extend([p.coordonnees.longitude, p.coordonnees.latitude]); });
      carte.fitBounds(bounds, { padding: 60, animate: false });
    }

    if (DONNEES.pointDeplacableId) {
      carte.on("click", function (e) {
        var marqueur = marqueurs[DONNEES.pointDeplacableId];
        if (marqueur) {
          marqueur.setLngLat(e.lngLat);
          envoyerMessage({ type: "deplacer", latitude: e.lngLat.lat, longitude: e.lngLat.lng });
        }
      });
    }
  });
  }
})();
</script>
</body>
</html>`;
}

export default function CarteOSM({
  points,
  pointDeplacableId,
  trace,
  hauteur = 220,
  zoomInitial = 14,
  onDeplacerPoint,
  pointLive = null,
}: CarteOSMProps) {
  const webviewRef = useRef<WebView>(null);
  const [secours, setSecours] = useState(false);
  const centre = useMemo(() => calculerCentre(points), [points]);
  const moteurMapbox = !!MAPBOX_TOKEN && !secours;

  // Clé stable reflétant les coordonnées réelles des éléments STATIQUES
  // (pas seulement leur nombre) : sans elle, un point mis à jour depuis
  // React (GPS, recherche d'adresse) ne redessinerait pas le pin dans la
  // WebView tant que le nombre de points ne change pas lui-même. Le point
  // "live" (position coursier) est volontairement exclu : ses mises à jour
  // passent par injectJavaScript, pas par un rechargement complet.
  const cleDonnees = useMemo(
    () =>
      JSON.stringify({
        points: points.map((p) => [p.id, p.coordonnees.latitude, p.coordonnees.longitude, p.couleur, p.label]),
        trace: trace?.map((p) => [p.latitude, p.longitude]) ?? [],
        pointDeplacableId: pointDeplacableId ?? null,
        moteurMapbox,
      }),
    [points, trace, pointDeplacableId, moteurMapbox]
  );

  const html = useMemo(() => {
    const donnees: DonneesCarte = {
      points,
      trace: trace ?? [],
      pointDeplacableId: pointDeplacableId ?? null,
      pointLive,
      centre,
      zoom: points.length > 1 ? 13 : zoomInitial,
    };
    return moteurMapbox ? construireHtmlMapbox(donnees, MAPBOX_TOKEN as string) : construireHtmlLeaflet(donnees);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleDonnees]);

  // Mises à jour du point live après le premier rendu : injection ciblée,
  // pas de rechargement de la WebView (évite de réinitialiser le zoom/pan).
  useEffect(() => {
    const script = `window.majPointLive && window.majPointLive(${JSON.stringify(pointLive)}); true;`;
    webviewRef.current?.injectJavaScript(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointLive?.coordonnees.latitude, pointLive?.coordonnees.longitude, pointLive?.couleur]);

  function surMessage(evenement: { nativeEvent: { data: string } }) {
    try {
      const message = JSON.parse(evenement.nativeEvent.data) as {
        type: string;
        latitude?: number;
        longitude?: number;
      };
      if (message.type === "deplacer" && onDeplacerPoint && message.latitude != null && message.longitude != null) {
        onDeplacerPoint({ latitude: message.latitude, longitude: message.longitude });
      } else if (message.type === "secours") {
        setSecours(true);
      }
    } catch {
      // Message inattendu, ignoré.
    }
  }

  return (
    <View style={{ height: hauteur, borderRadius: 16, overflow: "hidden" }}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        onMessage={surMessage}
        style={{ flex: 1 }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}
