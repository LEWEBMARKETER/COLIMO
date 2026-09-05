import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { CATEGORIE_COLIS_EMOJIS, formatDistanceM, formatDureeSecondes, type CourseSuiviPublic } from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import CarteItineraire from "@/components/CarteItineraire";
import BandeauStatut from "@/components/BandeauStatut";
import StatusTimeline from "@/components/StatusTimeline";
import NoteEtoiles from "@/components/NoteEtoiles";
import Bouton from "@/components/ui/Bouton";
import { getCourseSuiviPublic } from "@/lib/api";

// Écran public — accessible sans compte COLIMO ni connexion, via le lien
// envoyé au destinataire par WhatsApp à la création de la course
// (notifierEvenement("livraison_creee", ...)). Volontairement en lecture
// seule : ni prix, ni actions réservées à l'expéditeur (annuler, confirmer
// la réception, signaler un problème, discuter) — seulement de quoi suivre
// la livraison et joindre l'expéditeur ou le coursier par téléphone.
export default function SuiviPublicScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [course, setCourse] = useState<CourseSuiviPublic | null>(null);
  const [chargementInitial, setChargementInitial] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);

  useEffect(() => {
    if (!token) return;
    let annule = false;

    async function charger() {
      try {
        const donnees = await getCourseSuiviPublic(token as string);
        if (annule) return;
        if (donnees) {
          setCourse(donnees);
          setIntrouvable(false);
        } else {
          setIntrouvable(true);
        }
      } catch {
        // Réessaie au prochain intervalle plutôt que d'afficher une erreur transitoire.
      } finally {
        if (!annule) setChargementInitial(false);
      }
    }

    charger();
    const intervalle = setInterval(charger, 3000);
    return () => {
      annule = true;
      clearInterval(intervalle);
    };
  }, [token]);

  if (chargementInitial) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  if (introuvable || !course) {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">Suivi introuvable</Text>
          <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
            Ce lien de suivi n&apos;est plus valide, ou la livraison associée n&apos;existe plus.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const contactsFermes = course.statut === "confirmee";
  const nomCoursier = [course.coursierPrenom, course.coursierNom].filter(Boolean).join(" ");

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <BandeauStatut statut={course.statut} numeroCommande={course.numeroCommande} />

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-texte text-colimo-neutre-fonce/70">
          {CATEGORIE_COLIS_EMOJIS[course.categorieColis]} {course.typeColis}
        </Text>

        {course.codeOtp && (
          <View className="mt-3 items-center rounded-2xl border-2 border-colimo-rouge bg-white p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
              Votre code de réception
            </Text>
            <Text className="mt-1 font-titre-bold text-3xl text-colimo-rouge" style={{ letterSpacing: 6 }}>
              {course.codeOtp}
            </Text>
            <Text className="mt-1 text-center font-texte text-xs text-colimo-neutre-fonce/60">
              Communiquez ce code uniquement au coursier lorsqu&apos;il vous remet le colis.
            </Text>
          </View>
        )}

        {course.latitudeDepart !== null &&
          course.longitudeDepart !== null &&
          course.latitudeArrivee !== null &&
          course.longitudeArrivee !== null && (
            <View className="mt-3">
              <CarteItineraire
                depart={{ latitude: course.latitudeDepart, longitude: course.longitudeDepart }}
                arrivee={{ latitude: course.latitudeArrivee, longitude: course.longitudeArrivee }}
                positionCoursier={
                  course.coursierLatitude != null && course.coursierLongitude != null
                    ? { latitude: course.coursierLatitude, longitude: course.coursierLongitude }
                    : null
                }
              />
              {course.coursierLatitude != null && (course.distanceRestanteM != null || course.etaSecondes != null) && (
                <View className="-mt-2 mb-4 flex-row items-center justify-between rounded-2xl bg-colimo-rouge-clair px-4 py-3">
                  <Text className="font-texte-medium text-sm text-colimo-rouge">
                    {course.distanceRestanteM != null ? formatDistanceM(course.distanceRestanteM) : "—"} restants
                  </Text>
                  <Text className="font-texte-medium text-sm text-colimo-rouge">
                    {course.etaSecondes != null ? `~${formatDureeSecondes(course.etaSecondes)}` : "—"}
                  </Text>
                </View>
              )}
            </View>
          )}

        {course.coursierId && (
          <View className="mt-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
                  Votre coursier
                </Text>
                <Text className="mt-0.5 font-texte-medium text-colimo-neutre-fonce">{nomCoursier || "—"}</Text>
              </View>
              <NoteEtoiles note={course.coursierNote ?? 0} />
            </View>
            {course.coursierTelephone && !contactsFermes && (
              <Bouton
                label={`Appeler ${nomCoursier || "le coursier"}`}
                variante="contour"
                onPress={() => Linking.openURL(`tel:${course.coursierTelephone}`)}
                className="mt-3 py-2.5"
              />
            )}
          </View>
        )}

        <View className="mt-4">
          <ContactCarte
            titre="Récupération"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart ?? undefined}
            longitude={course.longitudeDepart ?? undefined}
            appelFerme={contactsFermes}
          />
          <ContactCarte
            titre="Livraison"
            nom={course.nomDestinataire}
            telephone={course.telephoneDestinataire}
            adresse={course.adresseArrivee}
            repere={course.repereArrivee}
            latitude={course.latitudeArrivee ?? undefined}
            longitude={course.longitudeArrivee ?? undefined}
            appelFerme
          />
        </View>

        {course.instructions && (
          <View className="mb-3 rounded-2xl bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline course={course} />
        </View>

        {course.statut === "litige" && (
          <Text className="mt-6 text-center font-texte text-sm text-colimo-rouge">
            Un problème a été signalé sur cette livraison. L&apos;équipe COLIMO le traite avec l&apos;expéditeur.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
