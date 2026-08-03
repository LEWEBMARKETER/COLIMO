import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/lib/AuthContext";

const ROUGE = "#C41E24";
const INACTIF = "#2B2622";

export default function ClientTabsLayout() {
  const { utilisateur } = useAuth();
  const estCommerce = utilisateur?.typeClient === "commerce";

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
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="historique"
        options={{
          title: "Historique",
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="statistiques"
        options={{
          title: "Statistiques",
          href: estCommerce ? "/(client)/statistiques" : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} />,
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
