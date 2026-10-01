import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { type Course, type ConfigurationRechercheCoursier } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import { annulerCourseClient, getConfigurationRechercheCoursier, marquerRelancesRechercheDues, prolongerRechercheCoursier } from "@/lib/api";
import { notifierMeilleursCoursiers } from "@/lib/communication";

// Pastille qui pulse pendant la recherche — indique un processus actif en
// arrière-plan, pas un écran figé.
function PointRecherche() {
  const echelle = useSharedValue(1);
  useEffect(() => {
    echelle.value = withRepeat(withTiming(1.6, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [echelle]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  return <Animated.View style={style} className="h-2.5 w-2.5 rounded-full bg-colimo-rouge" />;
}

function formatMmSs(ms: number): string {
  const totalSecondes = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSecondes / 60);
  const secondes = totalSecondes % 60;
  return `${minutes}:${String(secondes).padStart(2, "0")}`;
}

interface CarteRechercheCoursierProps {
  course: Course;
  clientId: string;
  // Le composant ne possède pas l'état `course` du parent (track/[id].tsx,
  // déjà rafraîchi par son propre poll 3s) — ces callbacks forcent un
  // rafraîchissement immédiat plutôt que d'attendre le prochain tick, pour
  // les deux moments où une seconde d'attente serait perceptible : la
  // prolongation et le cas "un coursier vient d'accepter" (CAS E).
  onRechercheProlongee: () => void;
  onCoursierTrouve: () => void;
}

/**
 * Contenu du bottom sheet "Recherche d'un coursier" (besoin COLIMO —
 * gestion du délai d'attente). 3 états dérivés de course.createdAt +
 * configuration_recherche_coursier + course.rechercheProlongeeAt — aucun
 * nouveau statut de course, aucun système de suivi parallèle (StatusTimeline/
 * BandeauStatut restent la seule source de vérité une fois un coursier
 * trouvé, cf. track/[id].tsx qui masque déjà ce composant hors "en_attente").
 */
export default function CarteRechercheCoursier({
  course,
  clientId,
  onRechercheProlongee,
  onCoursierTrouve,
}: CarteRechercheCoursierProps) {
  const [config, setConfig] = useState<ConfigurationRechercheCoursier | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [confirmationAnnulationVisible, setConfirmationAnnulationVisible] = useState(false);
  const [enCoursAnnulation, setEnCoursAnnulation] = useState(false);
  const [enCoursProlongation, setEnCoursProlongation] = useState(false);
  const [erreurAnnulation, setErreurAnnulation] = useState<string | null>(null);
  const [bonneNouvelleVisible, setBonneNouvelleVisible] = useState(false);

  useEffect(() => {
    let annule = false;
    getConfigurationRechercheCoursier()
      .then((c) => {
        if (!annule) setConfig(c);
      })
      .catch(() => {
        // Défensif : migrations pas encore appliquées, ou erreur réseau —
        // le délai par défaut (15 min) ci-dessous prend le relais, jamais
        // un écran cassé.
      });
    return () => {
      annule = true;
    };
  }, []);

  const prolongee = course.rechercheProlongeeAt !== null;

  // Le compteur ne tourne que tant qu'il y a quelque chose à afficher —
  // inutile de continuer à retick après prolongation (plus de chiffres à
  // mettre à jour, cf. besoin section 7 : "le compteur peut disparaître").
  useEffect(() => {
    if (prolongee) return;
    const minuteur = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuteur);
  }, [prolongee]);

  const delaiMinutes = config?.delaiRechercheMinutes ?? 15;
  const expireA = new Date(course.createdAt).getTime() + delaiMinutes * 60000;
  const restantMs = expireA - maintenant;
  const expire = restantMs <= 0;

  // Relance des coursiers éligibles (besoin section 13) — en piggyback sur
  // la présence du client sur cet écran plutôt qu'un cron (aucun cron
  // Vercel assez fréquent sur le plan actuel, cf. docs/RECHERCHE_COURSIER.md).
  // Réutilise notifierMeilleursCoursiers tel quel : aucune sélection de
  // coursiers dupliquée ici, seule la RPC détermine QUAND relancer.
  useEffect(() => {
    if (prolongee || expire) return;
    let annule = false;
    async function verifier() {
      try {
        const dus = await marquerRelancesRechercheDues(course.id);
        if (!annule && dus.length > 0) {
          await notifierMeilleursCoursiers(course, clientId);
        }
      } catch {
        // Best-effort — une relance manquée ne doit jamais perturber l'attente.
      }
    }
    verifier();
    const minuteur = setInterval(verifier, 60000);
    return () => {
      annule = true;
      clearInterval(minuteur);
    };
  }, [course.id, course, clientId, prolongee, expire]);

  async function continuerRecherche() {
    setEnCoursProlongation(true);
    try {
      await prolongerRechercheCoursier(course.id);
      onRechercheProlongee();
    } catch {
      // Best-effort : le prochain poll (3s, track/[id].tsx) reflétera de
      // toute façon l'état réel de la course.
    } finally {
      setEnCoursProlongation(false);
    }
  }

  async function confirmerAnnulation() {
    setEnCoursAnnulation(true);
    setErreurAnnulation(null);
    try {
      await annulerCourseClient({ courseId: course.id, motif: "no_courier_available" });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("coursier_deja_accepte")) {
        // CAS E : un coursier vient d'accepter entre le clic et la
        // vérification atomique côté serveur — jamais annulé dans ce cas.
        setConfirmationAnnulationVisible(false);
        setBonneNouvelleVisible(true);
        onCoursierTrouve();
        setTimeout(() => setBonneNouvelleVisible(false), 2500);
      } else {
        setErreurAnnulation("Impossible d'annuler cette demande. Réessayez.");
      }
    } finally {
      setEnCoursAnnulation(false);
    }
  }

  if (bonneNouvelleVisible) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} className="items-center py-2">
        <Text className="font-titre-bold text-base text-colimo-neutre-fonce">🏍️ Bonne nouvelle !</Text>
        <Text className="mt-1 text-center font-texte text-sm text-colimo-neutre-fonce/70">
          Un coursier vient d&apos;accepter votre demande. Vous pouvez maintenant suivre sa prise en charge.
        </Text>
      </Animated.View>
    );
  }

  if (confirmationAnnulationVisible) {
    return (
      <View>
        <Text className="font-titre-bold text-base text-colimo-neutre-fonce">Annuler cette demande ?</Text>
        <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">
          Aucun coursier n&apos;a encore accepté votre course. Vous pouvez continuer à rechercher un coursier ou
          annuler votre demande sans frais.
        </Text>
        {erreurAnnulation && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreurAnnulation}</Text>}
        <Bouton
          label="Continuer la recherche"
          variante="contour"
          onPress={() => setConfirmationAnnulationVisible(false)}
          disabled={enCoursAnnulation}
          className="mt-4 py-3.5"
        />
        <Bouton
          label="Confirmer l'annulation"
          onPress={confirmerAnnulation}
          chargement={enCoursAnnulation}
          className="mt-2 py-3.5"
        />
      </View>
    );
  }

  if (prolongee) {
    return (
      <View>
        <Text className="font-titre-bold text-base text-colimo-neutre-fonce">Recherche prolongée 🔎</Text>
        <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">
          Votre demande reste disponible pour les coursiers de votre zone. Nous vous informerons dès qu&apos;un
          coursier l&apos;accepte.
        </Text>
      </View>
    );
  }

  if (expire) {
    return (
      <View>
        <Text className="font-titre-bold text-base text-colimo-neutre-fonce">⏱️ Aucun coursier disponible pour le moment</Text>
        <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">
          Aucun coursier n&apos;a encore accepté votre demande. Vous pouvez continuer la recherche ou annuler votre
          course sans frais.
        </Text>
        <Bouton
          label="Continuer la recherche"
          onPress={continuerRecherche}
          chargement={enCoursProlongation}
          className="mt-4 py-3.5"
        />
        <Bouton
          label="Annuler la course"
          variante="contour"
          onPress={() => setConfirmationAnnulationVisible(true)}
          disabled={enCoursProlongation}
          className="mt-2 py-3.5"
        />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <PointRecherche />
      <View className="flex-1">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-titre-bold text-base text-colimo-neutre-fonce">🔎 Recherche d&apos;un coursier</Text>
          <Text className="font-titre-bold text-base text-colimo-neutre-fonce" style={{ fontVariant: ["tabular-nums"] }}>
            {formatMmSs(restantMs)}
          </Text>
        </View>
        <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/60">
          Votre demande est proposée aux coursiers disponibles dans votre zone.
        </Text>
      </View>
    </View>
  );
}
