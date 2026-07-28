import "../global.css";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { AuthProvider } from "@/lib/AuthContext";

// Import direct des fichiers de police (et non du package barrel), pour éviter
// que Metro n'embarque les 18 graisses de chaque famille dans le bundle web.
const Poppins_600SemiBold = require("@expo-google-fonts/poppins/Poppins_600SemiBold.ttf");
const Poppins_700Bold = require("@expo-google-fonts/poppins/Poppins_700Bold.ttf");
const Inter_400Regular = require("@expo-google-fonts/inter/Inter_400Regular.ttf");
const Inter_500Medium = require("@expo-google-fonts/inter/Inter_500Medium.ttf");

export default function RootLayout() {
  const [policesChargees] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!policesChargees) {
    return (
      <View className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <View className="flex-1 bg-colimo-neutre-clair md:items-center md:py-8">
        <View className="w-full flex-1 bg-colimo-fond md:max-w-[480px] md:rounded-[28px] md:shadow-2xl md:overflow-hidden">
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </View>
    </AuthProvider>
  );
}
