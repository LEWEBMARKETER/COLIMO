import { Stack } from "expo-router";

export default function TransporteurLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FAF8F5" },
        headerShadowVisible: false,
        headerTintColor: "#2B2622",
        headerTitleStyle: { fontFamily: "System", fontWeight: "600" },
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="vehicules" options={{ title: "Mes véhicules" }} />
      <Stack.Screen name="corriger-dossier" options={{ title: "Corriger mon dossier" }} />
    </Stack>
  );
}
