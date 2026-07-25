import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COURSE_STATUS_LABELS, ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import { getCourses } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function HistoriqueCoursierScreen() {
  const { session, coursier } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!session) return;
    getCourses({ coursierId: session.user.id })
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

  const gains = courses
    .filter((c) => c.statut === "confirmee")
    .reduce((total, c) => total + c.prix, 0);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <Text className="text-xs text-colimo-neutre-fonce/60">Gains cumulés</Text>
            <Text className="mt-1 font-titre text-lg font-semibold text-colimo-rouge">{formatFCFA(gains)}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <Text className="text-xs text-colimo-neutre-fonce/60">Note moyenne</Text>
            <Text className="mt-1 font-titre text-lg font-semibold text-colimo-neutre-fonce">
              {coursier?.noteMoyenne ? `${coursier.noteMoyenne} / 5` : "—"}
            </Text>
          </View>
        </View>

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
              onPress={() => router.push(`/(coursier)/course/${item.id}`)}
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
                <Text className="text-xs text-colimo-neutre-fonce/60">{COURSE_STATUS_LABELS[item.statut]}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
