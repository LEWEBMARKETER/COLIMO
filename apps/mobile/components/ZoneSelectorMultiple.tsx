import { Pressable, Text, View } from "react-native";
import { ZONE_LABELS, type Zone } from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];

interface ZoneSelectorMultipleProps {
  label: string;
  value: Zone[];
  onChange: (zones: Zone[]) => void;
}

export default function ZoneSelectorMultiple({ label, value, onChange }: ZoneSelectorMultipleProps) {
  function toggle(zone: Zone) {
    if (value.includes(zone)) {
      onChange(value.filter((z) => z !== zone));
    } else {
      onChange([...value, zone]);
    }
  }

  return (
    <View className="mb-4">
      <Text className="mb-2 font-texte-medium text-sm text-colimo-neutre-fonce">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {ZONES.map((zone) => {
          const selectionne = value.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => toggle(zone)}
              className={`rounded-full border px-4 py-2 ${
                selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
              }`}
            >
              <Text className={`font-texte-medium ${selectionne ? "text-white" : "text-colimo-neutre-fonce"}`}>
                {ZONE_LABELS[zone]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value.length === 0 && (
        <Text className="mt-2 font-texte text-xs text-colimo-rouge">
          Sélectionnez au moins une zone pour voir des demandes de livraison.
        </Text>
      )}
    </View>
  );
}
