"use client";

import { Fragment } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CENTRES_ZONES, COURSE_STATUS_LABELS, ZONE_LABELS, type Course } from "@colimo/shared";

function creerIcone(couleur: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${couleur};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const ICONE_DEPART = creerIcone("#C41E24");
const ICONE_ARRIVEE = creerIcone("#2563EB");

interface CarteCoursesInnerProps {
  courses: Course[];
  nomUtilisateur: (id: string) => string;
}

export default function CarteCoursesInner({ courses, nomUtilisateur }: CarteCoursesInnerProps) {
  const coursesLocalisees = courses.filter(
    (c) =>
      c.latitudeDepart !== undefined &&
      c.longitudeDepart !== undefined &&
      c.latitudeArrivee !== undefined &&
      c.longitudeArrivee !== undefined
  );

  const centre = CENTRES_ZONES.libreville;

  return (
    <MapContainer center={[centre.latitude, centre.longitude]} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; contributeurs OpenStreetMap"
        maxZoom={19}
      />
      {coursesLocalisees.map((course) => (
        <Fragment key={course.id}>
          <Marker position={[course.latitudeDepart as number, course.longitudeDepart as number]} icon={ICONE_DEPART}>
            <Popup>
              <strong>{course.numeroCommande}</strong>
              <br />
              Départ — {ZONE_LABELS[course.zoneDepart]}
              <br />
              Client : {nomUtilisateur(course.clientId)}
              <br />
              Statut : {COURSE_STATUS_LABELS[course.statut]}
            </Popup>
          </Marker>
          <Marker position={[course.latitudeArrivee as number, course.longitudeArrivee as number]} icon={ICONE_ARRIVEE}>
            <Popup>
              <strong>{course.numeroCommande}</strong>
              <br />
              Arrivée — {ZONE_LABELS[course.zoneArrivee]}
            </Popup>
          </Marker>
          <Polyline
            positions={[
              [course.latitudeDepart as number, course.longitudeDepart as number],
              [course.latitudeArrivee as number, course.longitudeArrivee as number],
            ]}
            color="#C41E24"
            weight={2}
            opacity={0.5}
            dashArray="4 6"
          />
        </Fragment>
      ))}
    </MapContainer>
  );
}
