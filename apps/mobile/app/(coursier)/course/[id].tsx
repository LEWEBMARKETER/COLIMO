import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { COURSE_STATUS_LABELS, formatFCFA, ZONE_LABELS, type CourseStatus } from "@colimo/shared";
import StatusTimeline from "@/components/StatusTimeline";
import { trouverCourse } from "@/lib/mockData";

const PROCHAIN_STATUT: Partial<Record<CourseStatus, CourseStatus>> = {
  en_attente: "acceptee",
  acceptee: "en_cours",
  en_cours: "livree",
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = trouverCourse(id ?? "");
  const [statut, setStatut] = useState<CourseStatus>(course?.statut ?? "en_attente");

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <Text className="text-colimo-neutre-fonce/60">Course introuvable</Text>
      </SafeAreaView>
    );
  }

  // TODO: persister la mise à jour du statut via Supabase (update courses.statut).
  const prochain = PROCHAIN_STATUT[statut];

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Text className="font-titre text-lg font-semibold text-colimo-neutre-fonce">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">{course.typeColis}</Text>
        <Text className="mt-1 font-titre font-semibold text-colimo-rouge">{formatFCFA(course.prix)}</Text>

        <View className="mt-8">
          <StatusTimeline statutActuel={statut} />
        </View>

        {prochain && (
          <Pressable onPress={() => setStatut(prochain)} className="mt-4 rounded-xl bg-colimo-rouge py-4">
            <Text className="text-center font-semibold text-white">
              Marquer « {COURSE_STATUS_LABELS[prochain]} »
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
