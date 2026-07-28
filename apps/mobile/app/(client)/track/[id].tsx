import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MODE_PAIEMENT_LABELS, ZONE_LABELS, formatFCFA, type Course } from "@colimo/shared";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import Bouton from "@/components/ui/Bouton";
import { getCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function TrackScreen() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!id) return;

    let annule = false;
    async function charger() {
      try {
        const donnees = await getCourse(id as string);
        if (!annule) setCourse(donnees);
      } catch {
        // La course n'est pas (encore) disponible ; on réessaiera au prochain intervalle.
      }
    }

    charger();
    const intervalle = setInterval(charger, 3000);
    return () => {
      annule = true;
      clearInterval(intervalle);
    };
  }, [id]);

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{course.numeroCommande}</Text>
        <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-titre text-colimo-rouge">{formatFCFA(course.prix)}</Text>
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
            {MODE_PAIEMENT_LABELS[course.modePaiement]}
          </Text>
        </View>

        <View className="mt-8">
          <StatusTimeline statutActuel={course.statut} />
        </View>

        {course.coursierId && (
          <Bouton
            label="Discuter avec le coursier"
            variante="contour"
            onPress={() => router.push(`/(client)/chat/${course.id}`)}
            className="mt-6 py-3"
          />
        )}

        {(course.statut === "livree" || course.statut === "confirmee") && course.coursierId && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.coursierId}
            titre="Comment s'est passée la livraison ?"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
