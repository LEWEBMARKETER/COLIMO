import { Pressable, ScrollView, Text, View } from "react-native";
import { ZONE_LABELS, type Zone } from "@colimo/shared";

const ZONES = Object.keys(ZONE_LABELS) as Zone[];

interface ZoneSelectorProps {
  label: string;
  value: Zone | null;
  onChange: (zone: Zone) => void;
}

export default function ZoneSelector({ label, value, onChange }: ZoneSelectorProps) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {ZONES.map((zone) => {
            const selectionne = value === zone;
            return (
              <Pressable
                key={zone}
                onPress={() => onChange(zone)}
                className={`rounded-full border px-4 py-2 ${
                  selectionne
                    ? "border-colimo-rouge bg-colimo-rouge"
                    : "border-colimo-neutre-clair bg-white"
                }`}
              >
                <Text className={selectionne ? "text-white" : "text-colimo-neutre-fonce"}>
                  {ZONE_LABELS[zone]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
