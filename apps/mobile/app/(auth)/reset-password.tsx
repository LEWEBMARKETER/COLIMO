import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { validerMotDePasse } from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { mettreAJourMotDePasse } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

type EtatLien = "verification" | "pret" | "invalide";

// Le lien reçu par e-mail contient un jeton que le client Supabase détecte
// et échange automatiquement au chargement de la page (detectSessionInUrl,
// activé par défaut) — l'événement PASSWORD_RECOVERY confirme qu'une
// session de récupération temporaire est active. On garde aussi un filet
// de sécurité (getSession) au cas où l'événement aurait déjà été émis avant
// que ce composant ne s'abonne, et un délai au-delà duquel on considère le
// lien expiré, déjà utilisé, ou invalide.
export default function ResetPasswordScreen() {
  const [etatLien, setEtatLien] = useState<EtatLien>("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [reussi, setReussi] = useState(false);

  useEffect(() => {
    let actif = true;

    const { data: abonnement } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && actif) setEtatLien("pret");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (actif && data.session) setEtatLien((e) => (e === "verification" ? "pret" : e));
    });

    const delai = setTimeout(() => {
      if (actif) setEtatLien((e) => (e === "verification" ? "invalide" : e));
    }, 3000);

    return () => {
      actif = false;
      abonnement.subscription.unsubscribe();
      clearTimeout(delai);
    };
  }, []);

  async function valider() {
    setErreur(null);
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    const erreurValidation = validerMotDePasse(motDePasse);
    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }
    setEnvoiEnCours(true);
    try {
      await mettreAJourMotDePasse(motDePasse);
      // Referme la session de récupération : l'utilisateur se reconnecte
      // volontairement avec son nouveau mot de passe, comme demandé.
      await supabase.auth.signOut();
      setReussi(true);
    } catch {
      setErreur("Impossible de modifier le mot de passe pour le moment. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (etatLien === "verification") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  if (etatLien === "invalide") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond">
        <View className="flex-1 justify-center px-6">
          <Text className="font-titre text-2xl text-colimo-neutre-fonce">Lien invalide ou expiré</Text>
          <Text className="mt-3 font-texte text-sm text-colimo-neutre-fonce/70">
            Ce lien de réinitialisation n&apos;est plus valide — il a peut-être déjà été utilisé ou a expiré.
            Demandez-en un nouveau.
          </Text>
          <Bouton
            label="Demander un nouveau lien"
            onPress={() => router.replace("/(auth)/forgot-password")}
            className="mt-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (reussi) {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond">
        <View className="flex-1 justify-center px-6">
          <Text className="font-titre text-2xl text-colimo-neutre-fonce">
            Votre mot de passe a été modifié avec succès.
          </Text>
          <Bouton
            label="Se connecter à COLIMO"
            onPress={() => router.replace("/(auth)/login")}
            className="mt-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond">
      <View className="flex-1 justify-center px-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Créer un nouveau mot de passe</Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Au moins 8 caractères, avec une lettre et un chiffre.
        </Text>

        <View className="mt-8">
          <ChampTexte
            label="Nouveau mot de passe"
            value={motDePasse}
            onChangeText={setMotDePasse}
            secureTextEntry
            placeholder="••••••••"
          />
          <ChampTexte
            label="Confirmer le nouveau mot de passe"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton label="Modifier mon mot de passe" onPress={valider} chargement={envoiEnCours} />
      </View>
    </SafeAreaView>
  );
}
