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
      <Stack.Screen name="dashboard" options={{ title: "Courses disponibles" }} />
      <Stack.Screen name="course/[id]" options={{ title: "Détail de la course" }} />
    </Stack>
  );
}
