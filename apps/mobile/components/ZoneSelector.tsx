import { ZONE_LABELS, type Zone } from "@colimo/shared";
import GroupePastilles from "./ui/GroupePastilles";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];

interface ZoneSelectorProps {
  label: string;
  value: Zone | null;
  onChange: (zone: Zone) => void;
}

export default function ZoneSelector({ label, value, onChange }: ZoneSelectorProps) {
  return (
    <GroupePastilles
      label={label}
      options={ZONES.map((zone) => ({ valeur: zone, label: ZONE_LABELS[zone] }))}
      value={value}
      onChange={onChange}
      defilement
    />
  );
}
