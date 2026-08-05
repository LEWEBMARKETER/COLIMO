import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMesCommunications } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

interface ClocheNotificationsProps {
  utilisateurId: string;
  route: Href;
}

// Icône de notifications avec pastille de compteur non-lu, insérée dans
// l'en-tête des tableaux de bord client et coursier (il n'y a pas de
// composant d'en-tête partagé aujourd'hui, chaque écran garde le sien —
// seule cette cloche est mutualisée). Compteur tenu à jour par Realtime,
// avec un polling de secours comme ChatThread.tsx.
export default function ClocheNotifications({ utilisateurId, route }: ClocheNotificationsProps) {
  const [nonLues, setNonLues] = useState(0);

  useEffect(() => {
    let annule = false;

    async function rafraichir() {
      try {
        const communications = await getMesCommunications(utilisateurId);
        if (!annule) {
          setNonLues(communications.filter((c) => c.statut !== "lu" && c.statut !== "echec").length);
        }
      } catch {
        // Un compteur qui échoue à se rafraîchir ne doit pas planter l'écran.
      }
    }

    rafraichir();
    const intervalle = setInterval(rafraichir, 10000);

    const channel = supabase
      .channel(`notifications-utilisateur-${utilisateurId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `utilisateur_id=eq.${utilisateurId}` },
        () => rafraichir()
      )
      .subscribe();

    return () => {
      annule = true;
      clearInterval(intervalle);
      supabase.removeChannel(channel);
    };
  }, [utilisateurId]);

  return (
    <Pressable onPress={() => router.push(route)} className="relative p-1">
      <Ionicons name="notifications-outline" size={24} color="#2B2622" />
      {nonLues > 0 && (
        <View
          className="absolute -right-0.5 -top-0.5 min-w-[16px] items-center justify-center rounded-full bg-colimo-rouge px-1"
          style={{ height: 16 }}
        >
          <Text className="font-texte-medium text-[10px] text-white">{nonLues > 9 ? "9+" : nonLues}</Text>
        </View>
      )}
    </Pressable>
  );
}
