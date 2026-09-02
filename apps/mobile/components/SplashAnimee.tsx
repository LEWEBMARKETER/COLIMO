import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable } from "react-native";

interface SplashAnimeeProps {
  onTermine: () => void;
}

// Identité de lancement — rejoue à chaque ouverture "à froid" de l'app
// (icône installée sur l'écran d'accueil du téléphone, ou rechargement de
// la PWA), puisque app/_layout.tsx (racine) n'est monté qu'une fois par
// chargement de page. Fond identique à app.json > splash.backgroundColor
// (#FAF8F5) pour qu'il n'y ait aucun flash de couleur au relais avec le
// splash natif Expo qui s'affiche juste avant que le JS ne prenne la main.
export default function SplashAnimee({ onTermine }: SplashAnimeeProps) {
  const echelleIcone = useRef(new Animated.Value(0.7)).current;
  const opaciteIcone = useRef(new Animated.Value(0)).current;
  const opaciteNom = useRef(new Animated.Value(0)).current;
  const translationNom = useRef(new Animated.Value(12)).current;
  const opaciteSlogan = useRef(new Animated.Value(0)).current;
  const opaciteEcran = useRef(new Animated.Value(1)).current;
  const termineeRef = useRef(false);

  function terminer() {
    if (termineeRef.current) return;
    termineeRef.current = true;
    Animated.timing(opaciteEcran, {
      toValue: 0,
      duration: 280,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onTermine());
  }

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(opaciteIcone, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(echelleIcone, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(opaciteNom, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translationNom, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opaciteSlogan, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(650),
    ]);

    sequence.start(() => terminer());

    // Filet de sécurité : si l'app perd le focus pendant l'animation (onglet
    // en arrière-plan, animations parfois suspendues côté web), on ne reste
    // jamais bloqué sur le splash au-delà d'un délai raisonnable.
    const filet = setTimeout(terminer, 4000);
    return () => clearTimeout(filet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // NativeWind n'applique pas className aux composants Animated.* (View/
    // Text/Image) dans cette configuration — vérifié : ça les laisse non
    // stylés (plein écran/centrage/couleurs perdus) sans la moindre erreur.
    // Tout est donc en style inline ici, avec les valeurs de
    // packages/shared/src/theme.ts recopiées (comme le fait déjà
    // BandeauStatut.tsx pour les couleurs dynamiques).
    <Animated.View
      style={{
        opacity: opaciteEcran,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FAF8F5",
      }}
    >
      <Pressable onPress={terminer} className="items-center justify-center">
        <Animated.Image
          source={require("../assets/icon.png")}
          style={{
            width: 96,
            height: 96,
            borderRadius: 22,
            opacity: opaciteIcone,
            transform: [{ scale: echelleIcone }],
          }}
          resizeMode="cover"
        />
        <Animated.Text
          style={{
            marginTop: 20,
            fontFamily: "Poppins_700Bold",
            fontSize: 30,
            letterSpacing: 1,
            color: "#C41E24",
            opacity: opaciteNom,
            transform: [{ translateY: translationNom }],
          }}
        >
          COLIMO
        </Animated.Text>
        <Animated.Text
          style={{
            marginTop: 4,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 3,
            color: "rgba(43, 38, 34, 0.6)",
            opacity: opaciteSlogan,
          }}
        >
          Directement chez vous
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}
