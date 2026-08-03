import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  formatFCFA,
  type Course,
  type CourseStatus,
  type EvenementNotification,
} from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import CarteItineraire from "@/components/CarteItineraire";
import BandeauStatut from "@/components/BandeauStatut";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import { getCourse, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/notifications";

const PROCHAIN_STATUT: Partial<Record<CourseStatus, CourseStatus>> = {
  acceptee: "retrait",
  retrait: "en_cours",
  en_cours: "livree",
};

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, utilisateur } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [maj, setMaj] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCourse(id as string).then(setCourse);
  }, [id]);

  const EVENEMENT_PAR_STATUT: Partial<Record<CourseStatus, EvenementNotification>> = {
    retrait: "colis_recupere",
    en_cours: "livraison_en_cours",
  };

  async function marquerProchainStatut() {
    if (!course || !session) return;
    const prochain = PROCHAIN_STATUT[course.statut];
    if (!prochain) return;
    setMaj(true);
    try {
      const misAJour = await patchCourse(course.id, { statut: prochain });
      setCourse(misAJour);
      const evenement = EVENEMENT_PAR_STATUT[prochain];
      if (evenement) {
        await notifierEvenement(evenement, {
          declenchePar: session.user.id,
          destinataire: misAJour.telephoneDestinataire,
          variables: {
            nom_client: misAJour.nomDestinataire ?? "client",
            numero_commande: misAJour.numeroCommande,
            nom_coursier: utilisateur?.prenom ?? utilisateur?.nom ?? "votre coursier",
            telephone: utilisateur?.telephone ?? "",
            temps: "quelques minutes",
          },
        });
      }
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
  const contactsFermes = course.statut === "confirmee";

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <BandeauStatut statut={course.statut} numeroCommande={course.numeroCommande} />

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>

        <Carte sombre className="mt-3">
          <View className="flex-row items-end justify-between">
            <ChiffreCle valeur={formatFCFA(course.prix)} label="Prix de la course" sombre />
            <Text className="font-texte text-xs text-white/60">{MODE_PAIEMENT_LABELS[course.modePaiement]}</Text>
          </View>
        </Carte>

        {course.latitudeDepart !== undefined &&
          course.longitudeDepart !== undefined &&
          course.latitudeArrivee !== undefined &&
          course.longitudeArrivee !== undefined && (
            <View className="mt-3">
              <CarteItineraire
                depart={{ latitude: course.latitudeDepart, longitude: course.longitudeDepart }}
                arrivee={{ latitude: course.latitudeArrivee, longitude: course.longitudeArrivee }}
                labelDepart="Expéditeur"
                labelArrivee="Destinataire"
              />
            </View>
          )}

        <View className="mt-4">
          <ContactCarte
            titre="Expéditeur"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart}
            longitude={course.longitudeDepart}
            appelFerme={contactsFermes}
          />
          <ContactCarte
            titre="Destinataire"
            nom={course.nomDestinataire}
            telephone={course.telephoneDestinataire}
            adresse={course.adresseArrivee}
            repere={course.repereArrivee}
            latitude={course.latitudeArrivee}
            longitude={course.longitudeArrivee}
            appelFerme={contactsFermes}
          />
        </View>

        {course.instructions && (
          <View className="mb-3 rounded-lg border-2 border-colimo-rouge bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline course={course} />
        </View>

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
      </ScrollView>

      {(prochain || !contactsFermes || STATUTS_SIGNALABLES.has(course.statut)) && (
        <View className="border-t-2 border-colimo-neutre-fonce bg-colimo-fond px-6 pb-2 pt-3">
          {(!contactsFermes || STATUTS_SIGNALABLES.has(course.statut)) && (
            <Text className="mb-2 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50">
              {STATUTS_SIGNALABLES.has(course.statut) && (
                <Text onPress={() => router.push(`/(coursier)/litige/${course.id}`)}>Signaler un problème</Text>
              )}
              {STATUTS_SIGNALABLES.has(course.statut) && !contactsFermes && "  ·  "}
              {!contactsFermes && (
                <Text onPress={() => router.push(`/(coursier)/chat/${course.id}`)}>Discuter avec le client</Text>
              )}
            </Text>
          )}
          {prochain && (
            <Bouton
              label={`Marquer « ${COURSE_STATUS_LABELS[prochain]} »`}
              onPress={marquerProchainStatut}
              chargement={maj}
              className="py-4"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
