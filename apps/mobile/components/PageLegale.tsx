import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import type { SectionLegale } from "@colimo/shared";

interface PageLegaleProps {
  titre: string;
  derniereMaj: string;
  sections: SectionLegale[];
}

export default function PageLegale({ titre, derniereMaj, sections }: PageLegaleProps) {
  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-row items-center px-6 py-4">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="font-texte-medium text-colimo-rouge">← Retour</Text>
        </Pressable>
        <Text className="font-titre text-xl text-colimo-neutre-fonce">{titre}</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="mb-4 font-texte text-xs italic text-colimo-neutre-fonce/50">{derniereMaj}</Text>

        {sections.map((section) => (
          <View key={section.titre} className="mb-6">
            <Text className="mb-2 font-texte-medium text-base text-colimo-neutre-fonce">{section.titre}</Text>
            {section.paragraphes.map((paragraphe) => (
              <Text key={paragraphe} className="mb-2 font-texte text-sm leading-5 text-colimo-neutre-fonce/70">
                {paragraphe}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
