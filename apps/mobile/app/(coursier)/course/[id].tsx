import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  formatFCFA,
  lienGoogleMaps,
  ZONE_LABELS,
  type Course,
  type CourseStatus,
} from "@colimo/shared";
import Ionicons from "@expo/vector-icons/Ionicons";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import Bouton from "@/components/ui/Bouton";
import { getCourse, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const PROCHAIN_STATUT: Partial<Record<CourseStatus, CourseStatus>> = {
  acceptee: "retrait",
  retrait: "en_cours",
  en_cours: "livree",
};

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);

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
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{course.numeroCommande}</Text>
        <Text className="mt-1 font-titre text-lg text-colimo-neutre-fonce">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>
        {course.telephoneDestinataire && (
          <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
            Destinataire : {course.telephoneDestinataire}
          </Text>
        )}
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-titre text-colimo-rouge">{formatFCFA(course.prix)}</Text>
          <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
            {MODE_PAIEMENT_LABELS[course.modePaiement]}
          </Text>
        </View>

        <View className="mt-6 gap-3">
          <View className="flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
            <Text className="flex-1 font-texte text-sm text-colimo-neutre-fonce/80" numberOfLines={1}>
              {course.adresseDepart}
            </Text>
            <Ionicons
              name="navigate-outline"
              size={18}
              color="#C41E24"
              onPress={() =>
                Linking.openURL(
                  lienGoogleMaps({
                    latitude: course.latitudeDepart,
                    longitude: course.longitudeDepart,
                    adresse: course.adresseDepart,
                  })
                )
              }
            />
          </View>
          <View className="flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3">
            <Text className="flex-1 font-texte text-sm text-colimo-neutre-fonce/80" numberOfLines={1}>
              {course.adresseArrivee}
            </Text>
            <Ionicons
              name="navigate-outline"
              size={18}
              color="#C41E24"
              onPress={() =>
                Linking.openURL(
                  lienGoogleMaps({
                    latitude: course.latitudeArrivee,
                    longitude: course.longitudeArrivee,
                    adresse: course.adresseArrivee,
                  })
                )
              }
            />
          </View>
        </View>

        <View className="mt-6">
          <StatusTimeline statutActuel={course.statut} />
        </View>

        {course.telephoneDestinataire && (
          <Bouton
            label="Appeler le client"
            onPress={() => Linking.openURL(`tel:${course.telephoneDestinataire}`)}
            className="mt-4 py-3"
          />
        )}

        <Bouton
          label="Discuter avec le client"
          variante="contour"
          onPress={() => router.push(`/(coursier)/chat/${course.id}`)}
          className="mt-4 py-3"
        />

        {prochain && (
          <Bouton
            label={`Marquer « ${COURSE_STATUS_LABELS[prochain]} »`}
            onPress={marquerProchainStatut}
            chargement={maj}
            className="mt-4"
          />
        )}

        {(course.statut === "livree" || course.statut === "confirmee") && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.clientId}
            titre="Comment s'est passée la course avec ce client ?"
          />
        )}

        {course.statut === "litige" && (
          <Text className="mt-6 text-center font-texte text-sm text-colimo-rouge">
            Ce problème a été signalé à notre équipe, qui va vous contacter pour le résoudre.
          </Text>
        )}

        {STATUTS_SIGNALABLES.has(course.statut) && (
          <Bouton
            label="Signaler un problème"
            variante="contour"
            onPress={() => router.push(`/(coursier)/litige/${course.id}`)}
            className="mt-4 py-3"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
