import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { supprimerMonCompte } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const MOT_CONFIRMATION = "SUPPRIMER";

// Suppression du compte en libre-service — même logique que côté admin
// (suppression réelle si aucun historique, sinon anonymisation +
// bannissement définitif de la connexion), via api/compte/supprimer.ts.
// Saisie de "SUPPRIMER" exigée avant d'activer le bouton : action
// irréversible, pas de simple confirm() natif suffisant ici.
export default function SupprimerCompteScreen() {
  const { signOut } = useAuth();
  const [confirmationTexte, setConfirmationTexte] = useState("");
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const peutSupprimer = confirmationTexte.trim().toUpperCase() === MOT_CONFIRMATION && !enCours;

  async function supprimer() {
    setErreur(null);
    setEnCours(true);
    try {
      await supprimerMonCompte(motif.trim() || undefined);
      await signOut();
      router.replace("/(auth)/login");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de supprimer votre compte pour le moment.");
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Supprimer mon compte</Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Cette action est irréversible. Si votre compte n&apos;a aucun historique (aucune course, aucun avis...), il
          sera supprimé définitivement. S&apos;il a de l&apos;historique, vos données personnelles seront anonymisées
          et votre connexion bloquée définitivement — l&apos;historique de vos courses/paiements sera conservé.
        </Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Si vous avez une course active en cours, attendez sa finalisation avant de supprimer votre compte.
        </Text>

        <View className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <ChampTexte
            label="Motif (facultatif)"
            value={motif}
            onChangeText={setMotif}
            placeholder="Pourquoi supprimez-vous votre compte ?"
          />
          <ChampTexte
            label={`Tapez "${MOT_CONFIRMATION}" pour confirmer`}
            value={confirmationTexte}
            onChangeText={setConfirmationTexte}
            autoCapitalize="characters"
            placeholder={MOT_CONFIRMATION}
          />

          {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

          <Bouton
            label="Supprimer définitivement mon compte"
            variante="contour"
            onPress={supprimer}
            disabled={!peutSupprimer}
            chargement={enCours}
          />
          <Bouton label="Annuler" variante="contour" onPress={() => router.back()} className="mt-3" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
