import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

const ROUGE = "#C41E24";
const INACTIF = "#2B2622";

export default function CoursierTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROUGE,
        tabBarInactiveTintColor: `${INACTIF}80`,
        tabBarStyle: { backgroundColor: "#FAF8F5", borderTopColor: "#F1EDEA", height: 58, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: "Inter_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="en-cours"
        options={{
          title: "En cours",
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gains"
        options={{
          title: "Gains",
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
