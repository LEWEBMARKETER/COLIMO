import { useState } from "react";
import { FlatList, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { formatFCFA, ZONE_LABELS } from "@colimo/shared";
import { coursesDisponibles, coursierZone } from "@/lib/mockData";

export default function CoursierDashboard() {
  const [disponible, setDisponible] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <View className="mb-4 flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
          <View>
            <Text className="font-medium text-colimo-neutre-fonce">Disponible</Text>
            <Text className="text-xs text-colimo-neutre-fonce/60">
              Zone : {ZONE_LABELS[coursierZone]}
            </Text>
          </View>
          <Switch value={disponible} onValueChange={setDisponible} />
        </View>

        {!disponible ? (
          <Text className="mt-6 text-center text-colimo-neutre-fonce/60">
            Passez disponible pour voir les courses de votre zone
          </Text>
        ) : (
          <FlatList
            data={coursesDisponibles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <View className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
                <Text className="font-medium text-colimo-neutre-fonce">
                  {item.adresseDepart} → {item.adresseArrivee}
                </Text>
                <Text className="mt-1 text-sm text-colimo-neutre-fonce/70">{item.typeColis}</Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="font-titre font-semibold text-colimo-rouge">
                    {formatFCFA(item.prix)}
                  </Text>
                  <Pressable
                    onPress={() => router.push(`/(coursier)/course/${item.id}`)}
                    className="rounded-lg bg-colimo-rouge px-4 py-2"
                  >
                    <Text className="text-sm font-semibold text-white">Accepter</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
