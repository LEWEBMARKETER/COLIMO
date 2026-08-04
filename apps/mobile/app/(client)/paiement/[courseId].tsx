import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import type { Course } from "@colimo/shared";
import PaiementAirtelMoney from "@/components/PaiementAirtelMoney";
import { getCourse } from "@/lib/api";

export default function PaiementScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!courseId) return;
    getCourse(courseId).then(setCourse);
  }, [courseId]);

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <Text className="px-6 pt-4 font-titre text-2xl text-colimo-neutre-fonce">Paiement de la livraison</Text>
      <PaiementAirtelMoney course={course} />
    </SafeAreaView>
  );
}
