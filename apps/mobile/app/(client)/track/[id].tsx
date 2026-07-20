import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ZONE_LABELS } from "@colimo/shared";
import StatusTimeline from "@/components/StatusTimeline";
import { trouverCourse } from "@/lib/mockData";

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Course de démonstration tant que la publication n'écrit pas encore dans Supabase.
  const course = trouverCourse(id ?? "") ?? trouverCourse("d1")!;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Text className="font-titre text-lg font-semibold text-colimo-neutre-fonce">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">{course.typeColis}</Text>

        <View className="mt-8">
          <StatusTimeline statutActuel={course.statut} />
        </View>
      </View>
    </SafeAreaView>
  );
}
