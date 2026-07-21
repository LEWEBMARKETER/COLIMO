import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useRole } from "@/lib/RoleContext";

export default function RoleScreen() {
  const { setRole } = useRole();

  function choisir(role: "client" | "coursier") {
    setRole(role);
    router.replace(role === "client" ? "/(client)" : "/(coursier)/dashboard");
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">
          Continuer en tant que
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">
          L&apos;application COLIMO s&apos;adapte selon votre profil
        </Text>

        <Pressable
          onPress={() => choisir("client")}
          className="mt-8 rounded-xl bg-colimo-rouge py-4"
        >
          <Text className="text-center font-semibold text-white">Client</Text>
        </Pressable>

        <Pressable
          onPress={() => choisir("coursier")}
          className="mt-3 rounded-xl border border-colimo-rouge py-4"
        >
          <Text className="text-center font-semibold text-colimo-rouge">Coursier</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
