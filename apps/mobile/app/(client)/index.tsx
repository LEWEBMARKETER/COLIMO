import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function ClientHome() {
  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 justify-between px-6 py-8">
        <View>
          <Text className="font-titre text-xl font-semibold text-colimo-neutre-fonce">
            Bonjour 👋
          </Text>
          <Text className="mt-1 text-colimo-neutre-fonce/70">
            Où souhaitez-vous envoyer un colis aujourd&apos;hui ?
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(client)/publish")}
          className="rounded-xl bg-colimo-rouge py-4"
        >
          <Text className="text-center text-base font-semibold text-white">Nouvelle course</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
