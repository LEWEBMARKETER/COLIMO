import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { validerMotDePasse } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { changerMotDePasse } from "@/lib/api";

// Changement de mot de passe depuis une session normale (exige de
// reconnaître le mot de passe actuel) — distinct de /(auth)/reset-password,
// qui ne sert que le lien de récupération envoyé par email.
export default function MotDePasseScreen() {
  const [motDePasseActuel, setMotDePasseActuel] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setErreur(null);
    setSucces(false);
    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const erreurValidation = validerMotDePasse(nouveauMotDePasse);
    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }
    setEnCours(true);
    try {
      await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
      setSucces(true);
      setMotDePasseActuel("");
      setNouveauMotDePasse("");
      setConfirmation("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de modifier le mot de passe pour le moment.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Mot de passe</Text>
        <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
          Confirmez votre mot de passe actuel pour en définir un nouveau.
        </Text>

        <View className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <ChampTexte
            label="Mot de passe actuel"
            value={motDePasseActuel}
            onChangeText={setMotDePasseActuel}
            secureTextEntry
            autoComplete="current-password"
          />
          <ChampTexte
            label="Nouveau mot de passe"
            value={nouveauMotDePasse}
            onChangeText={setNouveauMotDePasse}
            secureTextEntry
            autoComplete="new-password"
          />
          <ChampTexte
            label="Confirmer le nouveau mot de passe"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
          />

          {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
          {succes && <Text className="mb-2 font-texte text-sm text-green-700">Mot de passe modifié avec succès ✓</Text>}

          <Bouton
            label="Enregistrer"
            onPress={valider}
            disabled={!motDePasseActuel || !nouveauMotDePasse || !confirmation}
            chargement={enCours}
          />
          <Bouton label="Annuler" variante="contour" onPress={() => router.back()} className="mt-3" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
