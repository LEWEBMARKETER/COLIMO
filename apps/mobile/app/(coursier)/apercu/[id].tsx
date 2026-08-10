import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  CATEGORIE_COLIS_EMOJIS,
  CATEGORIE_COLIS_LABELS,
  MODE_PAIEMENT_LABELS,
  QUI_PAIE_LABELS,
  TAILLE_COLIS_LABELS,
  ZONE_LABELS,
  formatFCFA,
  type Course,
} from "@colimo/shared";
import CarteItineraire from "@/components/CarteItineraire";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import { getCourse } from "@/lib/api";
import { accepterCourse } from "@/lib/coursierActions";
import { useAuth } from "@/lib/AuthContext";

function LigneInfo({ label, valeur }: { label: string; valeur: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-colimo-neutre-clair py-2 last:border-0">
      <Text className="font-texte text-sm text-colimo-neutre-fonce/60">{label}</Text>
      <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">{valeur}</Text>
    </View>
  );
}

export default function ApercuCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, utilisateur } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [accepteEnCours, setAccepteEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getCourse(id as string)
        .then((c) => {
          // Une course déjà prise par un autre coursier (ou annulée) entre le
          // moment où le coursier voit la liste et où il ouvre l'aperçu.
          if (c.statut !== "en_attente") {
            setIntrouvable(true);
          } else {
            setCourse(c);
          }
        })
        .catch(() => setIntrouvable(true));
    }, [id])
  );

  async function accepter() {
    if (!course || !session) return;
    setErreur(null);
    setAccepteEnCours(true);
    try {
      await accepterCourse(course, session, utilisateur);
      router.replace(`/(coursier)/course/${course.id}`);
    } catch {
      setErreur("Impossible d'accepter cette course. Elle a peut-être déjà été prise.");
      setAccepteEnCours(false);
      setIntrouvable(true);
    }
  }

  if (introuvable) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond px-6" edges={["bottom"]}>
        <Text className="text-center font-texte text-colimo-neutre-fonce/70">
          Cette course n&apos;est plus disponible — elle a probablement déjà été acceptée.
        </Text>
        <Bouton label="Retour" variante="contour" onPress={() => router.back()} className="mt-4 px-6" />
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
          {ZONE_LABELS[course.zoneDepart]} → {ZONE_LABELS[course.zoneArrivee]}
        </Text>

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
                labelDepart="Récupération"
                labelArrivee="Livraison"
              />
            </View>
          )}

        <Carte className="mt-1">
          <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
            Récupération
          </Text>
          <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.adresseDepart}</Text>
          {course.repereDepart && (
            <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">{course.repereDepart}</Text>
          )}
        </Carte>

        <Carte className="mt-3">
          <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
            Livraison
          </Text>
          <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.adresseArrivee}</Text>
          {course.repereArrivee && (
            <Text className="mt-0.5 font-texte text-xs text-colimo-neutre-fonce/60">{course.repereArrivee}</Text>
          )}
          <Text className="mt-2 font-texte text-xs text-colimo-neutre-fonce/50">
            Nom et téléphone du destinataire visibles après acceptation
          </Text>
        </Carte>

        <Carte className="mt-3">
          <LigneInfo
            label="Colis"
            valeur={`${CATEGORIE_COLIS_EMOJIS[course.categorieColis]} ${CATEGORIE_COLIS_LABELS[course.categorieColis]}`}
          />
          {course.tailleColis && <LigneInfo label="Taille" valeur={TAILLE_COLIS_LABELS[course.tailleColis]} />}
          {course.poidsEstime !== null && <LigneInfo label="Poids estimé" valeur={`${course.poidsEstime} kg`} />}
          {course.valeurDeclaree !== undefined && course.valeurDeclaree > 0 && (
            <LigneInfo label="Valeur déclarée" valeur={formatFCFA(course.valeurDeclaree)} />
          )}
          <LigneInfo label="Qui paie" valeur={QUI_PAIE_LABELS[course.quiPaie]} />
          {course.livraisonPrioritaire && <LigneInfo label="Livraison" valeur="Prioritaire" />}
          {course.programmeePour && (
            <LigneInfo
              label="Programmée pour"
              valeur={new Date(course.programmeePour).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
        </Carte>

        {course.instructions && (
          <View className="mt-3 rounded-lg border-2 border-colimo-rouge bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        {erreur && <Text className="mt-4 text-center font-texte text-sm text-colimo-rouge">{erreur}</Text>}
      </ScrollView>

      <View className="border-t-2 border-colimo-neutre-fonce bg-colimo-fond px-6 pb-2 pt-3">
        <Bouton
          label="Accepter cette course"
          onPress={accepter}
          chargement={accepteEnCours}
          className="py-4"
        />
      </View>
    </SafeAreaView>
  );
}
