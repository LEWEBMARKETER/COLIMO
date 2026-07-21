import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FAF8F5" },
        headerShadowVisible: false,
        headerTintColor: "#2B2622",
        headerTitleStyle: { fontFamily: "System", fontWeight: "600" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "COLIMO" }} />
      <Stack.Screen name="publish" options={{ title: "Nouvelle course" }} />
      <Stack.Screen name="track/[id]" options={{ title: "Suivi de la course" }} />
    </Stack>
  );
}
