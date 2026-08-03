import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MODE_PAIEMENT_LABELS, ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import StatutChip from "@/components/ui/StatutChip";
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
        <Text className="mb-4 font-titre text-2xl text-colimo-neutre-fonce">Mes courses</Text>
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
              Aucune course pour l&apos;instant
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(client)/track/${item.id}`)}>
              <View className="rounded-2xl bg-white p-4 shadow-sm">
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
                {item.telephoneDestinataire && (
                  <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">
                    Client : {item.telephoneDestinataire}
                  </Text>
                )}
                <View className="mt-2.5 flex-row items-center justify-between">
                  <Text className="font-titre text-colimo-rouge">{formatFCFA(item.prix)}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                      {MODE_PAIEMENT_LABELS[item.modePaiement]}
                    </Text>
                    <StatutChip statut={item.statut} intensite="douce" />
                  </View>
                </View>
              </View>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
