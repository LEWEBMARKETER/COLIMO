import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { COURSE_STATUS_LABELS, ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import Carte from "@/components/ui/Carte";
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
          <Carte className="flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Gains cumulés</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-rouge">{formatFCFA(gains)}</Text>
          </Carte>
          <Carte className="flex-1">
            <Text className="font-texte text-xs text-colimo-neutre-fonce/60">Note moyenne</Text>
            <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
              {coursier?.noteMoyenne ? `${coursier.noteMoyenne} / 5` : "—"}
            </Text>
          </Carte>
        </View>

        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          ListEmptyComponent={
            <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
              Aucune course pour l&apos;instant
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(coursier)/course/${item.id}`)}>
              <Carte>
                <View className="flex-row items-center justify-between">
                  <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">
                    {item.numeroCommande}
                  </Text>
                  <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">
                  {ZONE_LABELS[item.zoneDepart]} → {ZONE_LABELS[item.zoneArrivee]}
                </Text>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="font-titre text-colimo-rouge">{formatFCFA(item.prix)}</Text>
                  <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
                    {COURSE_STATUS_LABELS[item.statut]}
                  </Text>
                </View>
              </Carte>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
