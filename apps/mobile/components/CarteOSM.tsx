import { useMemo, useRef } from "react";
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
}

const LIBREVILLE: Coordonnees = { latitude: 0.4162, longitude: 9.4673 };

function calculerCentre(points: PointCarte[]): Coordonnees {
  if (points.length === 0) return LIBREVILLE;
  const latitude = points.reduce((total, p) => total + p.coordonnees.latitude, 0) / points.length;
  const longitude = points.reduce((total, p) => total + p.coordonnees.longitude, 0) / points.length;
  return { latitude, longitude };
}

function construireHtml(donnees: {
  points: PointCarte[];
  trace: Coordonnees[];
  pointDeplacableId: string | null;
  centre: Coordonnees;
  zoom: number;
}): string {
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

  function envoyerMessage(message) {
    var texte = JSON.stringify(message);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(texte);
    }
    if (window.parent) {
      window.parent.postMessage(texte, "*");
    }
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
    var icone = L.divIcon({
      className: "",
      html:
        '<div style="width:18px;height:18px;border-radius:50%;background:' +
        point.couleur +
        ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    var marqueur = L.marker([point.coordonnees.latitude, point.coordonnees.longitude], {
      icon: icone,
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
    var latlngs = DONNEES.trace.map(function (p) {
      return [p.latitude, p.longitude];
    });
    L.polyline(latlngs, { color: "#C41E24", weight: 4, opacity: 0.7 }).addTo(carte);
  }

  var listeMarqueurs = Object.keys(marqueurs).map(function (id) {
    return marqueurs[id];
  });
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

export default function CarteOSM({
  points,
  pointDeplacableId,
  trace,
  hauteur = 220,
  zoomInitial = 14,
  onDeplacerPoint,
}: CarteOSMProps) {
  const webviewRef = useRef<WebView>(null);
  const centre = useMemo(() => calculerCentre(points), [points]);

  // Clé stable reflétant les coordonnées réelles (pas seulement leur nombre) :
  // sans elle, un point mis à jour depuis React (GPS, recherche d'adresse)
  // ne redessinerait pas le pin dans la WebView tant que le nombre de
  // points ne change pas lui-même.
  const cleDonnees = useMemo(
    () =>
      JSON.stringify({
        points: points.map((p) => [p.id, p.coordonnees.latitude, p.coordonnees.longitude, p.couleur, p.label]),
        trace: trace?.map((p) => [p.latitude, p.longitude]) ?? [],
        pointDeplacableId: pointDeplacableId ?? null,
      }),
    [points, trace, pointDeplacableId]
  );

  const html = useMemo(
    () =>
      construireHtml({
        points,
        trace: trace ?? [],
        pointDeplacableId: pointDeplacableId ?? null,
        centre,
        zoom: points.length > 1 ? 13 : zoomInitial,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cleDonnees]
  );

  function surMessage(evenement: { nativeEvent: { data: string } }) {
    try {
      const message = JSON.parse(evenement.nativeEvent.data) as {
        type: string;
        latitude: number;
        longitude: number;
      };
      if (message.type === "deplacer" && onDeplacerPoint) {
        onDeplacerPoint({ latitude: message.latitude, longitude: message.longitude });
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
