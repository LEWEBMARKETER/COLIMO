import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/lib/AuthContext";

export default function ClientHome() {
  const { utilisateur, signOut } = useAuth();

  async function handleDeconnexion() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 justify-between px-6 py-8">
        <View>
          <Text className="font-titre text-xl font-semibold text-colimo-neutre-fonce">
            Bonjour {utilisateur?.nom ?? ""} 👋
          </Text>
          <Text className="mt-1 text-colimo-neutre-fonce/70">
            Où souhaitez-vous envoyer un colis aujourd&apos;hui ?
          </Text>
        </View>

        <View>
          <Pressable
            onPress={() => router.push("/(client)/publish")}
            className="rounded-xl bg-colimo-rouge py-4"
          >
            <Text className="text-center text-base font-semibold text-white">Nouvelle course</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(client)/historique")}
            className="mt-3 rounded-xl border border-colimo-neutre-clair bg-white py-4"
          >
            <Text className="text-center text-base font-semibold text-colimo-neutre-fonce">Mes courses</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/faq")} className="mt-4 py-2">
            <Text className="text-center text-sm text-colimo-neutre-fonce/60">FAQ</Text>
          </Pressable>

          <Pressable onPress={handleDeconnexion} className="mt-1 py-2">
            <Text className="text-center text-sm text-colimo-neutre-fonce/60">Se déconnecter</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
