import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { FAQ } from "@colimo/shared";
import Carte from "@/components/ui/Carte";

export default function FaqScreen() {
  const [ouvert, setOuvert] = useState<number | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="w-full flex-1 md:mx-auto md:max-w-2xl">
        <View className="flex-row items-center px-6 py-4">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Text className="font-texte-medium text-colimo-rouge">← Retour</Text>
          </Pressable>
          <Text className="font-titre text-xl text-colimo-neutre-fonce">FAQ</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {FAQ.map((item, index) => {
            const estOuvert = ouvert === index;
            return (
              <Pressable key={item.question} onPress={() => setOuvert(estOuvert ? null : index)}>
                <Carte>
                  <Text className="font-texte-medium text-colimo-neutre-fonce">{item.question}</Text>
                  {estOuvert && (
                    <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">{item.reponse}</Text>
                  )}
                </Carte>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
