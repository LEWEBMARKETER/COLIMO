import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { MODE_PAIEMENT_LABELS, distanceKm, formatFCFA, type Coursier, type Course, type Utilisateur } from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import NoteEtoiles from "@/components/NoteEtoiles";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { getCourse, getCoursierByUtilisateurId, getUtilisateur, patchCourse } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/notifications";

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);

export default function TrackScreen() {
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [coursier, setCoursier] = useState<Coursier | null>(null);
  const [coursierUtilisateur, setCoursierUtilisateur] = useState<Utilisateur | null>(null);

  async function confirmerReception() {
    if (!course || !session) return;
    setConfirmationEnCours(true);
    setErreurConfirmation(null);
    try {
      const misAJour = await patchCourse(course.id, { statut: "confirmee" });
      setCourse(misAJour);
      await notifierEvenement("livraison_terminee", {
        declenchePar: session.user.id,
        destinataire: misAJour.telephoneDestinataire,
        variables: { nom_client: misAJour.nomDestinataire ?? "client" },
      });
    } catch {
      setErreurConfirmation("Impossible de confirmer la réception. Réessayez.");
    } finally {
      setConfirmationEnCours(false);
    }
  }

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

  useEffect(() => {
    if (!course?.coursierId) {
      setCoursier(null);
      setCoursierUtilisateur(null);
      return;
    }
    getCoursierByUtilisateurId(course.coursierId).then(setCoursier);
    getUtilisateur(course.coursierId).then(setCoursierUtilisateur);
  }, [course?.coursierId]);

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

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

  const contactsFermes = course.statut === "confirmee";

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-texte-medium text-xs text-colimo-neutre-fonce/50">{course.numeroCommande}</Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>

        <Carte sombre className="mt-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-texte text-xs text-white/60">Prix</Text>
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

        {coursierUtilisateur && (
          <Carte className="mt-3">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
              Votre coursier
            </Text>
            <Text className="mt-1 font-texte-medium text-colimo-neutre-fonce">
              {coursierUtilisateur.prenom ? `${coursierUtilisateur.prenom} ` : ""}
              {coursierUtilisateur.nom}
            </Text>
            <View className="mt-1">
              <NoteEtoiles note={coursier?.noteMoyenne ?? 0} />
            </View>
          </Carte>
        )}

        <View className="mt-4">
          <ContactCarte
            titre="Récupération"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart}
            longitude={course.longitudeDepart}
            appelFerme={contactsFermes}
          />
          <ContactCarte
            titre="Livraison"
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
          <View className="mb-3 rounded-2xl bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline course={course} />
        </View>

        {course.coursierId && !contactsFermes && (
          <Bouton
            label="Discuter avec le coursier"
            variante="contour"
            onPress={() => router.push(`/(client)/chat/${course.id}`)}
            className="mt-6 py-3"
          />
        )}

        {course.statut === "livree" && (
          <View className="mt-4">
            <Bouton
              label="Confirmer la réception du colis"
              onPress={confirmerReception}
              chargement={confirmationEnCours}
              className="py-3"
            />
            {erreurConfirmation && (
              <Text className="mt-2 text-center font-texte text-xs text-colimo-rouge">{erreurConfirmation}</Text>
            )}
          </View>
        )}

        {(course.statut === "livree" || course.statut === "confirmee") && course.coursierId && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.coursierId}
            titre="Comment s'est passée la livraison ?"
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
            onPress={() => router.push(`/(client)/litige/${course.id}`)}
            className="mt-4 py-3"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
