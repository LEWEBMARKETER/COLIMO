"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CENTRES_ZONES, type Coordonnees, type Zone } from "@colimo/shared";

export interface CoursierCartePoint {
  id: string;
  nom: string;
  latitude: number;
  longitude: number;
  numeroCommande?: string | null;
}

interface CarteLiveInnerProps {
  coursiersActifs: CoursierCartePoint[];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Cercle approximatif (overlay indicatif de zone desservie, pas une
// frontière administrative réelle) — première brique en vue d'une
// cartographie précise des zones de livraison, à affiner plus tard avec de
// vrais contours.
function cercleGeoJSON(centre: Coordonnees, rayonKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 48;
  const distanceX = rayonKm / (111.32 * Math.cos((centre.latitude * Math.PI) / 180));
  const distanceY = rayonKm / 110.57;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([centre.longitude + distanceX * Math.cos(theta), centre.latitude + distanceY * Math.sin(theta)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

export default function CarteLiveInner({ coursiersActifs }: CarteLiveInnerProps) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<mapboxgl.Map | null>(null);
  const marqueursRef = useRef<Record<string, mapboxgl.Marker>>({});

  useEffect(() => {
    if (!conteneurRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const centre = CENTRES_ZONES.libreville;
    const carte = new mapboxgl.Map({
      container: conteneurRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centre.longitude, centre.latitude],
      zoom: 11,
    });
    carte.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    carteRef.current = carte;

    carte.on("load", () => {
      (Object.keys(CENTRES_ZONES) as Zone[]).forEach((zone) => {
        const id = `zone-${zone}`;
        carte.addSource(id, { type: "geojson", data: cercleGeoJSON(CENTRES_ZONES[zone], 3) });
        carte.addLayer({ id: `${id}-fill`, type: "fill", source: id, paint: { "fill-color": "#C41E24", "fill-opacity": 0.04 } });
        carte.addLayer({
          id: `${id}-line`,
          type: "line",
          source: id,
          paint: { "line-color": "#C41E24", "line-opacity": 0.25, "line-width": 1.5, "line-dasharray": [2, 2] },
        });
      });
    });

    return () => {
      carte.remove();
      carteRef.current = null;
    };
  }, []);

  useEffect(() => {
    const carte = carteRef.current;
    if (!carte) return;

    const idsActuels = new Set(coursiersActifs.map((c) => c.id));
    Object.keys(marqueursRef.current).forEach((id) => {
      if (!idsActuels.has(id)) {
        marqueursRef.current[id]?.remove();
        delete marqueursRef.current[id];
      }
    });

    coursiersActifs.forEach((c) => {
      const existant = marqueursRef.current[c.id];
      const texte = c.numeroCommande ? `${c.nom} — ${c.numeroCommande}` : c.nom;
      if (existant) {
        existant.setLngLat([c.longitude, c.latitude]);
        existant.getPopup()?.setText(texte);
      } else {
        const el = document.createElement("div");
        el.style.cssText =
          "width:20px;height:20px;border-radius:50%;background:#16A34A;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.45);";
        const marqueur = new mapboxgl.Marker({ element: el })
          .setLngLat([c.longitude, c.latitude])
          .setPopup(new mapboxgl.Popup({ closeButton: false, offset: 16 }).setText(texte))
          .addTo(carte);
        marqueursRef.current[c.id] = marqueur;
      }
    });
  }, [coursiersActifs]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-colimo-neutre-fonce/50">
        Carte Mapbox non configurée (NEXT_PUBLIC_MAPBOX_TOKEN manquant côté Vercel) — les coursiers actifs restent
        listés ci-dessous.
      </div>
    );
  }

  return <div ref={conteneurRef} style={{ height: "100%", width: "100%" }} />;
}
