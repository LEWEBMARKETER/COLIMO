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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "list" : "list-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="en-cours"
        options={{
          title: "En cours",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "navigate" : "navigate-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gains"
        options={{
          title: "Gains",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="support"
        options={{
          title: "Support",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "help-buoy" : "help-buoy-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
