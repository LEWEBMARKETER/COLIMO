import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  distanceKm,
  formatFCFA,
  type Course,
  type CourseStatus,
} from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
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
  const distance =
    course.latitudeDepart !== undefined &&
    course.longitudeDepart !== undefined &&
    course.latitudeArrivee !== undefined &&
    course.longitudeArrivee !== undefined
      ? distanceKm(
          { latitude: course.latitudeDepart, longitude: course.longitudeDepart },
          { latitude: course.latitudeArrivee, longitude: course.longitudeArrivee }
        )
      : null;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{course.numeroCommande}</Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>

        <Carte sombre className="mt-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-texte text-xs text-white/60">Prix de la course</Text>
            <Text className="font-titre text-white">{formatFCFA(course.prix)}</Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="font-texte text-xs text-white/60">Paiement</Text>
            <Text className="font-texte text-sm text-white">{MODE_PAIEMENT_LABELS[course.modePaiement]}</Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="font-texte text-xs text-white/60">Distance</Text>
            <Text className="font-texte text-sm text-white">
              {distance !== null ? `${distance.toFixed(1)} km` : "Non disponible"}
            </Text>
          </View>
        </Carte>

        <View className="mt-4">
          <ContactCarte
            titre="Expéditeur"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart}
            longitude={course.longitudeDepart}
          />
          <ContactCarte
            titre="Destinataire"
            nom={course.nomDestinataire}
            telephone={course.telephoneDestinataire}
            adresse={course.adresseArrivee}
            repere={course.repereArrivee}
            latitude={course.latitudeArrivee}
            longitude={course.longitudeArrivee}
          />
        </View>

        {course.instructions && (
          <View className="mb-3 rounded-2xl bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline statutActuel={course.statut} />
        </View>

        {prochain && (
          <Bouton
            label={`Marquer « ${COURSE_STATUS_LABELS[prochain]} »`}
            onPress={marquerProchainStatut}
            chargement={maj}
            className="mt-2"
          />
        )}

        <Bouton
          label="Discuter avec le client"
          variante="contour"
          onPress={() => router.push(`/(coursier)/chat/${course.id}`)}
          className="mt-3 py-3"
        />

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
