import { ZONE_LABELS, zonesArriveeDesservies, zonesDepartDesservies, type Zone } from "@colimo/shared";
import GroupePastilles from "./ui/GroupePastilles";

const TOUTES_LES_ZONES = Object.keys(ZONE_LABELS) as Zone[];

interface ZoneSelectorProps {
  label: string;
  value: Zone | null;
  onChange: (zone: Zone) => void;
  // Restreint les options aux zones réellement desservies par la grille
  // tarifaire, pour une course dont la zone choisie ici sert de départ ou
  // d'arrivée — évite de proposer une zone (ex : PK12, Bikélé-Essassa en
  // départ) qui mènerait systématiquement à "route non desservie". Omis :
  // toutes les zones (usage hors création de course, ex. zone de profil).
  role?: "depart" | "arrivee";
  // Avec role="arrivee" : la zone de départ déjà choisie, pour ne montrer
  // que les zones réellement atteignables depuis elle.
  depart?: Zone | null;
}

export default function ZoneSelector({ label, value, onChange, role, depart }: ZoneSelectorProps) {
  const zones =
    role === "depart"
      ? zonesDepartDesservies()
      : role === "arrivee"
        ? zonesArriveeDesservies(depart)
        : TOUTES_LES_ZONES;

  return (
    <GroupePastilles
      label={label}
      options={zones.map((zone) => ({ valeur: zone, label: ZONE_LABELS[zone] }))}
      value={value}
      onChange={onChange}
      defilement
    />
  );
}
