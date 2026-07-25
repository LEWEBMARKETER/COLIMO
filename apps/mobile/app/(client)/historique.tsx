import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Pressable } from "react-native";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  ZONE_LABELS,
  formatFCFA,
  type Course,
} from "@colimo/shared";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function HistoriqueClientScreen() {
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!session) return;
    getCourses({ clientId: session.user.id })
      .then(setCourses)
      .finally(() => setChargement(false));
  }, [session]);

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          ListEmptyComponent={
            <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
              Aucune course pour l&apos;instant
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/(client)/track/${item.id}`)}
              className="rounded-2xl border border-colimo-neutre-clair bg-white p-4"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-titre text-xs font-semibold text-colimo-neutre-fonce/50">
                  {item.numeroCommande}
                </Text>
                <Text className="text-xs text-colimo-neutre-fonce/50">
                  {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              <Text className="mt-1 font-medium text-colimo-neutre-fonce">
                {ZONE_LABELS[item.zoneDepart]} → {ZONE_LABELS[item.zoneArrivee]}
              </Text>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="font-titre font-semibold text-colimo-rouge">{formatFCFA(item.prix)}</Text>
                <Text className="text-xs text-colimo-neutre-fonce/60">
                  {COURSE_STATUS_LABELS[item.statut]} · {MODE_PAIEMENT_LABELS[item.modePaiement]}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
