import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
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
const LEAFLET_CSS_ID = "colimo-leaflet-css";

// Metro (bundler web d'Expo) ne sait pas importer un .css depuis
// node_modules comme le ferait Next.js — on charge la feuille de style de
// Leaflet à l'exécution, une seule fois, comme les tuiles OSM le sont déjà.
function chargerCssLeaflet() {
  if (typeof document === "undefined" || document.getElementById(LEAFLET_CSS_ID)) return;
  const lien = document.createElement("link");
  lien.id = LEAFLET_CSS_ID;
  lien.rel = "stylesheet";
  lien.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(lien);
}

function creerIcone(couleur: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${couleur};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function calculerCentre(points: PointCarte[]): Coordonnees {
  if (points.length === 0) return LIBREVILLE;
  const latitude = points.reduce((total, p) => total + p.coordonnees.latitude, 0) / points.length;
  const longitude = points.reduce((total, p) => total + p.coordonnees.longitude, 0) / points.length;
  return { latitude, longitude };
}

function GestionCliqueCarte({
  pointDeplacableId,
  onDeplacerPoint,
}: {
  pointDeplacableId?: string;
  onDeplacerPoint?: (coordonnees: Coordonnees) => void;
}) {
  useMapEvents({
    click(e) {
      if (!pointDeplacableId || !onDeplacerPoint) return;
      onDeplacerPoint({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function AjusterVue({ points }: { points: PointCarte[] }) {
  const carte = useMap();
  useEffect(() => {
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.coordonnees.latitude, p.coordonnees.longitude]));
      carte.fitBounds(bounds.pad(0.35));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export default function CarteOSM({
  points,
  pointDeplacableId,
  trace,
  hauteur = 220,
  zoomInitial = 14,
  onDeplacerPoint,
}: CarteOSMProps) {
  useEffect(() => {
    chargerCssLeaflet();
  }, []);

  const centre = useMemo(() => calculerCentre(points), [points]);
  const zoom = points.length > 1 ? 13 : zoomInitial;

  return (
    <View style={{ height: hauteur, borderRadius: 16, overflow: "hidden" }}>
      <MapContainer
        key={`${points.length}-${pointDeplacableId ?? ""}`}
        center={[centre.latitude, centre.longitude]}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; contributeurs OpenStreetMap"
          maxZoom={19}
        />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.coordonnees.latitude, point.coordonnees.longitude]}
            icon={creerIcone(point.couleur)}
            draggable={point.id === pointDeplacableId}
            eventHandlers={
              point.id === pointDeplacableId
                ? {
                    dragend: (e) => {
                      const position = e.target.getLatLng();
                      onDeplacerPoint?.({ latitude: position.lat, longitude: position.lng });
                    },
                  }
                : undefined
            }
          />
        ))}
        {trace && trace.length > 1 && (
          <Polyline positions={trace.map((p) => [p.latitude, p.longitude])} color="#C41E24" weight={4} opacity={0.7} />
        )}
        <GestionCliqueCarte pointDeplacableId={pointDeplacableId} onDeplacerPoint={onDeplacerPoint} />
        <AjusterVue points={points} />
      </MapContainer>
    </View>
  );
}
