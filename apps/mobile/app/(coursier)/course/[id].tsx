import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  formatFCFA,
  ZONE_LABELS,
  type Course,
  type CourseStatus,
} from "@colimo/shared";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import { getCourse, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const PROCHAIN_STATUT: Partial<Record<CourseStatus, CourseStatus>> = {
  acceptee: "en_cours",
  en_cours: "livree",
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [maj, setMaj] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCourse(id as string).then(setCourse);
  }, [id]);

  async function marquerProchainStatut() {
    if (!course) return;
    const prochain = PROCHAIN_STATUT[course.statut];
    if (!prochain) return;
    setMaj(true);
    try {
      const misAJour = await patchCourse(course.id, { statut: prochain });
      setCourse(misAJour);
    } finally {
      setMaj(false);
    }
  }

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const prochain = PROCHAIN_STATUT[course.statut];

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Text className="text-xs font-semibold text-colimo-neutre-fonce/50">{course.numeroCommande}</Text>
        <Text className="mt-1 font-titre text-lg font-semibold text-colimo-neutre-fonce">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">{course.typeColis}</Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-titre font-semibold text-colimo-rouge">{formatFCFA(course.prix)}</Text>
          <Text className="text-xs text-colimo-neutre-fonce/60">{MODE_PAIEMENT_LABELS[course.modePaiement]}</Text>
        </View>

        <View className="mt-8">
          <StatusTimeline statutActuel={course.statut} />
        </View>

        <Pressable
          onPress={() => router.push(`/(coursier)/chat/${course.id}`)}
          className="mt-4 rounded-xl border border-colimo-neutre-clair bg-white py-3"
        >
          <Text className="text-center font-semibold text-colimo-neutre-fonce">Discuter avec le client</Text>
        </Pressable>

        {prochain && (
          <Pressable
            disabled={maj}
            onPress={marquerProchainStatut}
            className="mt-4 rounded-xl bg-colimo-rouge py-4"
          >
            <Text className="text-center font-semibold text-white">
              Marquer « {COURSE_STATUS_LABELS[prochain]} »
            </Text>
          </Pressable>
        )}

        {(course.statut === "livree" || course.statut === "confirmee") && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.clientId}
            titre="Comment s'est passée la course avec ce client ?"
          />
        )}
      </View>
    </SafeAreaView>
  );
}
