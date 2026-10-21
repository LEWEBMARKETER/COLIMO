import { useCallback } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { useAuth } from "@/lib/AuthContext";

// 3 statuts visibles uniquement (besoin métier) — mappés en affichage sur
// l'enum verification_status existant (en_attente/valide/rejete), jamais
// renommé en base (partagé avec coursiers).
const MESSAGES_STATUT: Record<string, { titre: string; description: string }> = {
  en_attente: {
    titre: "EN_ATTENTE — dossier en cours de vérification",
    description: "COLIMO examine votre dossier. Vous pourrez recevoir des demandes de transport une fois votre compte confirmé.",
  },
  valide: {
    titre: "CONFIRME — compte vérifié",
    description: "Votre dossier est confirmé. Les demandes de transport seront bientôt disponibles dans cet espace.",
  },
  rejete: {
    titre: "NON_CONFIRME — dossier à corriger",
    description: "Votre dossier n'a pas été confirmé. Corrigez les éléments indiqués puis soumettez-le à nouveau.",
  },
};

// Écran d'accueil transporteur (COLIMO TRANSPORT) : statut du dossier,
// motif à corriger le cas échéant, gestion des véhicules. refreshProfile
// (AuthContext) recharge le statut à chaque retour sur l'écran — une
// décision admin pendant que l'app est ouverte ne doit jamais rester
// affichée comme périmée (cf. colimo-mobile-ux : useFocusEffect, pas un
// useEffect seul, pour toute donnée mutable côté serveur).
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
          {transporteur.statutVerification === "rejete" && transporteur.dernierMotifRejet && (
            <View className="mt-3 rounded-xl bg-colimo-rouge-clair px-3 py-2.5">
              <Text className="font-texte-medium text-xs text-colimo-rouge">
                Motif : {transporteur.dernierMotifRejet}
              </Text>
            </View>
          )}
        </Carte>

        {transporteur.statutVerification === "rejete" && (
          <Bouton
            label="Corriger mon dossier"
            onPress={() => router.push("/(transporteur)/corriger-dossier")}
            className="mt-4 py-3.5"
          />
        )}

        <Bouton
          label="Mes véhicules"
          variante="contour"
          onPress={() => router.push("/(transporteur)/vehicules")}
          className="mt-4 py-3.5"
        />

        <Text onPress={signOut} className="mt-8 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50">
          Se déconnecter
        </Text>
      </View>
    </SafeAreaView>
  );
}
