import "../global.css";
import { Stack } from "expo-router";
import { RoleProvider } from "@/lib/RoleContext";

export default function RootLayout() {
  return (
    <RoleProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RoleProvider>
  );
}
