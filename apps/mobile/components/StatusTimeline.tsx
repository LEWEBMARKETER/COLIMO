import { Text, View } from "react-native";
import { COURSE_STATUS_LABELS, type CourseStatus } from "@colimo/shared";

const ETAPES: CourseStatus[] = ["en_attente", "acceptee", "en_cours", "livree", "confirmee"];

export default function StatusTimeline({ statutActuel }: { statutActuel: CourseStatus }) {
  const indexActuel = ETAPES.indexOf(statutActuel);

  return (
    <View>
      {ETAPES.map((etape, index) => {
        const atteinte = indexActuel >= 0 && index <= indexActuel;
        return (
          <View key={etape} className="flex-row items-center">
            <View className="items-center">
              <View
                className={`h-3 w-3 rounded-full ${atteinte ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"}`}
              />
              {index < ETAPES.length - 1 && (
                <View className={`h-8 w-0.5 ${atteinte ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"}`} />
              )}
            </View>
            <Text
              className={`ml-3 pb-8 text-sm ${
                atteinte ? "font-medium text-colimo-neutre-fonce" : "text-colimo-neutre-fonce/50"
              }`}
            >
              {COURSE_STATUS_LABELS[etape]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
