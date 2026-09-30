import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { formatFCFA, ZONE_LABELS, type Course, type PalierCommission, type PerformanceMensuelleCoursier, type Zone } from "@colimo/shared";
import CourseDisponibleCard from "@/components/CourseDisponibleCard";
import BandeauNotificationsPush from "@/components/BandeauNotificationsPush";
import ClocheNotifications from "@/components/ClocheNotifications";
import CarteStatutCommission from "@/components/CarteStatutCommission";
import { getCataloguePaliersCommission, getCourses, getMaPerformanceMensuelle, patchCoursier } from "@/lib/api";
import { accepterCourse } from "@/lib/coursierActions";
import { useAuth } from "@/lib/AuthContext";

export default function CoursierDashboard() {
  const { session, utilisateur, coursier, refreshProfile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [gainsNets, setGainsNets] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [performance, setPerformance] = useState<PerformanceMensuelleCoursier | null>(null);
  const [paliers, setPaliers] = useState<PalierCommission[]>([]);

  useEffect(() => {
    if (!session) return;
    getCourses({ coursierId: session.user.id }).then((mesCourses) => {
      const confirmees = mesCourses.filter((c) => c.statut === "confirmee");
      setGainsNets(confirmees.reduce((s, c) => s + (c.prix - c.commission), 0));
    });
  }, [session]);

  // Palier de commission du mois — peut changer pendant que l'onglet reste
  // ouvert (une course confirmée ailleurs dans l'app fait progresser le
  // compteur), donc useFocusEffect plutôt qu'un useEffect seul (cf.
  // colimo-mobile-ux). Deux requêtes indépendantes, jamais groupées dans un
  // seul Promise.all (même règle).
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      getMaPerformanceMensuelle().then(setPerformance).catch(() => {});
      getCataloguePaliersCommission().then(setPaliers).catch(() => {});
    }, [session])
  );

  const zonesDisponibilite: Zone[] = coursier?.zonesCouvertes?.length
    ? coursier.zonesCouvertes
    : utilisateur?.zone
      ? [utilisateur.zone]
      : [];

  const chargerCourses = useCallback(async () => {
    if (coursier?.disponibilite && zonesDisponibilite.length > 0) {
      const disponibles = await getCourses({ zones: zonesDisponibilite, statut: "en_attente" });
      // Mise en avant du meilleur match : les courses dans la zone
      // principale du coursier remontent en premier — le pool reste le
      // même pour tous, seul l'ordre d'affichage change (aucun changement
      // au mécanisme d'acceptation, premier arrivé premier servi).
      const zonePrincipale = utilisateur?.zone;
      const tri = [...disponibles].sort((a, b) => {
        const aMatch = zonePrincipale && a.zoneDepart === zonePrincipale ? 1 : 0;
        const bMatch = zonePrincipale && b.zoneDepart === zonePrincipale ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setCourses(tri);
    } else {
      setCourses([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coursier?.disponibilite, JSON.stringify(zonesDisponibilite), utilisateur?.zone]);

  useEffect(() => {
    setChargement(true);
    chargerCourses().finally(() => setChargement(false));
  }, [chargerCourses]);

  // Rafraîchit la liste des demandes disponibles pendant que l'écran est
  // actif, pour voir les nouvelles courses en temps quasi réel sans avoir à
  // quitter puis rouvrir l'app.
  useFocusEffect(
    useCallback(() => {
      chargerCourses();
      const intervalle = setInterval(chargerCourses, 5000);
      return () => clearInterval(intervalle);
    }, [chargerCourses])
  );

  // Action la plus fréquente de l'écran (cf. colimo-mobile-ux) — un léger
  // rebond confirme immédiatement l'appui, avant même la réponse serveur.
  const echelleDisponibilite = useSharedValue(1);
  const styleRangeeDisponibilite = useAnimatedStyle(() => ({
    transform: [{ scale: echelleDisponibilite.value }],
    borderColor: withTiming(coursier?.disponibilite ? "#C41E24" : "#2B2622", { duration: 250 }),
  }));

  async function toggleDisponibilite(valeur: boolean) {
    if (!coursier) return;
    echelleDisponibilite.value = withSequence(
      withTiming(1.03, { duration: 90 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    );
    await patchCoursier(coursier.id, { disponibilite: valeur });
    await refreshProfile();
  }

  async function accepter(course: Course) {
    if (!session) return;
    setErreur(null);
    try {
      await accepterCourse(course, session, utilisateur);
      router.push(`/(coursier)/course/${course.id}`);
    } catch {
      setErreur("Impossible d'accepter cette course. Elle a peut-être déjà été prise.");
      chargerCourses();
    }
  }

  if (chargement) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const compteBloque = coursier?.statut === "suspendu" || coursier?.statut === "desactive";

  const afficherListe =
    !compteBloque && coursier?.statutVerification === "valide" && coursier?.disponibilite && zonesDisponibilite.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <FlatList
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 28, gap: 12 }}
        data={afficherListe ? courses : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View className="mb-5">
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 font-texte text-sm text-colimo-neutre-fonce/60" numberOfLines={1}>
                Bonjour {utilisateur?.prenom ?? utilisateur?.nom ?? ""}
              </Text>
              {session && <ClocheNotifications utilisateurId={session.user.id} route="/(coursier)/notifications" />}
            </View>

            {session && (
              <View className="mt-3">
                <BandeauNotificationsPush utilisateurId={session.user.id} />
              </View>
            )}

            <View className="mt-3">
              <CarteStatutCommission performance={performance} paliers={paliers} />
            </View>

            {/* Chiffre-clé du jour, traitement éditorial : le nombre porte
                l'information, la légende reste discrète. */}
            <View className="mt-2 flex-row items-end justify-between border-b-2 border-colimo-neutre-fonce pb-3">
              <View>
                <Text className="font-titre-bold text-3xl text-colimo-neutre-fonce" style={{ fontVariant: ["tabular-nums"] }}>
                  {formatFCFA(gainsNets)}
                </Text>
                <Text className="mt-1 font-texte-medium text-[11px] uppercase tracking-wide text-colimo-neutre-fonce/50">
                  Gains nets cumulés
                </Text>
              </View>
              <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
                {courses.length} course{courses.length > 1 ? "s" : ""} dispo
              </Text>
            </View>

            <Animated.View
              style={styleRangeeDisponibilite}
              className="mt-4 flex-row items-center justify-between rounded-lg border-2 bg-white px-4 py-3"
            >
              <View className="flex-1 pr-3">
                <Text className="font-texte-medium text-colimo-neutre-fonce">Disponible</Text>
                <Text className="font-texte text-xs text-colimo-neutre-fonce/60">
                  {zonesDisponibilite.length > 0 ? zonesDisponibilite.map((z) => ZONE_LABELS[z]).join(", ") : "Aucune zone sélectionnée"}
                </Text>
              </View>
              <Switch
                value={coursier?.disponibilite ?? false}
                onValueChange={toggleDisponibilite}
                disabled={coursier?.statutVerification !== "valide" || compteBloque}
                trackColor={{ true: "#C41E24" }}
              />
            </Animated.View>

            {erreur && <Text className="mt-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

            {compteBloque ? (
              <Text className="mt-5 text-center font-texte text-colimo-rouge">
                {coursier?.statut === "suspendu"
                  ? "Ton compte est suspendu. Contacte le support COLIMO pour plus d'informations."
                  : "Ton compte a été désactivé."}
              </Text>
            ) : coursier?.statutVerification !== "valide" ? (
              <Text className="mt-5 text-center font-texte text-colimo-neutre-fonce/60">
                Ton inscription est en cours de validation par COLIMO. Tu pourras accepter des
                courses une fois validé·e.
              </Text>
            ) : !coursier?.disponibilite ? (
              <Text className="mt-5 text-center font-texte text-colimo-neutre-fonce/60">
                Passe disponible pour voir les courses de tes zones
              </Text>
            ) : zonesDisponibilite.length === 0 ? (
              <Text
                onPress={() => router.push("/(coursier)/profil")}
                className="mt-5 text-center font-texte text-sm text-colimo-rouge"
              >
                Ajoute des zones couvertes dans ton profil pour voir des demandes
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          afficherListe ? (
            <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
              Aucune course disponible pour l&apos;instant
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <CourseDisponibleCard
            course={item}
            onVoirDetails={() => router.push(`/(coursier)/apercu/${item.id}`)}
            onAccepter={() => accepter(item)}
            recommandee={!!utilisateur?.zone && item.zoneDepart === utilisateur.zone}
          />
        )}
      />
    </SafeAreaView>
  );
}
