import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FAQ } from "@colimo/shared";

export default function FaqScreen() {
  const [ouvert, setOuvert] = useState<number | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-row items-center px-6 py-4">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-colimo-rouge">← Retour</Text>
        </Pressable>
        <Text className="font-titre text-xl font-semibold text-colimo-neutre-fonce">FAQ</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {FAQ.map((item, index) => {
          const estOuvert = ouvert === index;
          return (
            <Pressable
              key={item.question}
              onPress={() => setOuvert(estOuvert ? null : index)}
              className="rounded-2xl border border-colimo-neutre-clair bg-white p-4"
            >
              <Text className="font-medium text-colimo-neutre-fonce">{item.question}</Text>
              {estOuvert && <Text className="mt-2 text-sm text-colimo-neutre-fonce/70">{item.reponse}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
