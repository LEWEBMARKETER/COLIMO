import { Stack } from "expo-router";

export default function CoursierLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FAF8F5" },
        headerShadowVisible: false,
        headerTintColor: "#2B2622",
        headerTitleStyle: { fontFamily: "System", fontWeight: "600" },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="apercu/[id]" options={{ title: "Aperçu de la course" }} />
      <Stack.Screen name="course/[id]" options={{ title: "Détail de la course" }} />
      <Stack.Screen name="chat/[courseId]" options={{ title: "Discussion" }} />
      <Stack.Screen name="litige/[courseId]" options={{ title: "Signaler un problème" }} />
    </Stack>
  );
}
