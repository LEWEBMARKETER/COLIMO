import { useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { useAuth } from "@/lib/AuthContext";

const MESSAGES_STATUT: Record<string, { titre: string; description: string }> = {
  en_attente: {
    titre: "Dossier en cours de vérification",
    description: "COLIMO examine votre dossier. Vous pourrez recevoir des demandes de transport une fois votre compte validé.",
  },
  valide: {
    titre: "Compte vérifié",
    description: "Votre dossier est validé. Les demandes de transport seront bientôt disponibles dans cet espace.",
  },
  rejete: {
    titre: "Dossier rejeté",
    description: "Votre dossier n'a pas été validé. Contactez le support COLIMO pour en connaître la raison.",
  },
};

// Écran d'accueil transporteur (COLIMO TRANSPORT, Phase 1 — fondations) :
// aucune mission/devis à ce stade, seulement le statut du dossier et la
// gestion des véhicules. refreshProfile (AuthContext) recharge le statut à
// chaque retour sur l'écran — une validation admin pendant que l'app est
// ouverte ne doit jamais rester affichée comme "en attente" (cf.
// colimo-mobile-ux : useFocusEffect, pas un useEffect seul, pour toute
// donnée mutable côté serveur).
export default function TransporteurDashboard() {
  const { utilisateur, transporteur, refreshProfile, signOut } = useAuth();

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!transporteur) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const message = MESSAGES_STATUT[transporteur.statutVerification];

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <View className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">
          Bonjour {utilisateur?.prenom ?? utilisateur?.nom}
        </Text>
        <Text className="mt-1 font-texte text-colimo-neutre-fonce/70">Espace transporteur COLIMO</Text>

        <Carte className="mt-6">
          <Text className="font-titre-bold text-base text-colimo-neutre-fonce">{message.titre}</Text>
          <Text className="mt-1.5 font-texte text-sm text-colimo-neutre-fonce/70">{message.description}</Text>
        </Carte>

        <Bouton
          label="Mes véhicules"
          variante="contour"
          onPress={() => router.push("/(transporteur)/vehicules")}
          className="mt-6 py-3.5"
        />

        <Text onPress={signOut} className="mt-8 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50">
          Se déconnecter
        </Text>
      </View>
    </SafeAreaView>
  );
}
