import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import {
  CATALOGUE_FONCTIONNALITES_PREMIUM,
  PRIX_PACK_BUSINESS,
  PRIX_PACK_STARTER,
  SUBSCRIPTION_PLAN_LABELS,
  calculerPlanEffectif,
  formatFCFA,
  peutAccederFonctionnalite,
  type Commercant,
  type ConfigurationPaiementAbonnement,
  type CleFonctionnalitePremium,
  type PackPayant,
  type SubscriptionPlan,
} from "@colimo/shared";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import { demanderActivationAbonnement, getConfigurationPaiementAbonnement, getMonCommerce } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const PALIERS: SubscriptionPlan[] = ["gratuit", "starter", "business"];

export default function DecouvrirOffresScreen() {
  const { session } = useAuth();
  const { feature } = useLocalSearchParams<{ feature?: CleFonctionnalitePremium }>();
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [config, setConfig] = useState<ConfigurationPaiementAbonnement | null>(null);
  const [demandeEnCours, setDemandeEnCours] = useState<PackPayant | null>(null);
  const [demandeEnvoyee, setDemandeEnvoyee] = useState<PackPayant | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    getMonCommerce(session.user.id).then(setCommerce);
    getConfigurationPaiementAbonnement().then(setConfig);
  }, [session]);

  const planEffectif: SubscriptionPlan = commerce ? calculerPlanEffectif(commerce) : "gratuit";

  async function demanderActivation(pack: PackPayant) {
    setErreur(null);
    setDemandeEnCours(pack);
    try {
      await demanderActivationAbonnement(pack);
      setDemandeEnvoyee(pack);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible d'envoyer la demande. Réessayez.");
    } finally {
      setDemandeEnCours(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">COLIMO PRO</Text>
        <Text className="mt-2 font-texte text-sm text-colimo-neutre-fonce/70">
          Commandez vos livraisons gratuitement sur COLIMO. Passez à une offre professionnelle pour débloquer
          davantage d&apos;outils de gestion.
        </Text>

        {demandeEnvoyee && (
          <Carte className="mt-4 border border-colimo-rouge/30 bg-colimo-rouge-clair">
            <Text className="font-texte-medium text-sm text-colimo-rouge">
              Votre demande pour le Pack {SUBSCRIPTION_PLAN_LABELS[demandeEnvoyee]} a été envoyée.
            </Text>
            {config && (
              <View className="mt-2">
                <Text className="font-texte text-sm text-colimo-neutre-fonce">{config.instructions}</Text>
                {config.numeroPaiement && (
                  <Text className="mt-1 font-texte-medium text-sm text-colimo-neutre-fonce">
                    {config.moyenPaiement} : {config.numeroPaiement} ({config.nomBeneficiaire})
                  </Text>
                )}
                {config.whatsapp && (
                  <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/70">WhatsApp : {config.whatsapp}</Text>
                )}
                {config.emailContact && (
                  <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/70">
                    Email : {config.emailContact}
                  </Text>
                )}
              </View>
            )}
          </Carte>
        )}

        {erreur && <Text className="mt-3 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <View className="mt-6 gap-4">
          {PALIERS.map((palier) => (
            <Carte
              key={palier}
              className={palier === planEffectif ? "border-2 border-colimo-rouge" : "border border-colimo-neutre-clair"}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-titre text-lg text-colimo-neutre-fonce">{SUBSCRIPTION_PLAN_LABELS[palier]}</Text>
                {palier === planEffectif && (
                  <Text className="font-texte-medium text-xs uppercase text-colimo-rouge">Votre forfait</Text>
                )}
              </View>
              <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
                {palier === "gratuit"
                  ? "Gratuit — vous payez uniquement les courses commandées"
                  : `${formatFCFA(palier === "starter" ? PRIX_PACK_STARTER : PRIX_PACK_BUSINESS)} / mois`}
              </Text>

              <View className="mt-3 gap-1.5">
                {CATALOGUE_FONCTIONNALITES_PREMIUM.map((f) => {
                  const disponible = peutAccederFonctionnalite(palier, f.cle);
                  const surligne = f.cle === feature;
                  return (
                    <View
                      key={f.cle}
                      className="flex-row items-start gap-2 rounded-lg"
                      style={surligne ? { backgroundColor: "#FBE7E7", padding: 4 } : undefined}
                    >
                      <Text className={disponible ? "text-colimo-rouge" : "text-colimo-neutre-fonce/30"}>
                        {disponible ? "✓" : "🔒"}
                      </Text>
                      <Text
                        className={`flex-1 font-texte text-xs ${
                          disponible ? "text-colimo-neutre-fonce" : "text-colimo-neutre-fonce/50"
                        }`}
                      >
                        {f.nom}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {palier !== "gratuit" && (
                <Bouton
                  label={demandeEnvoyee === palier ? "Demande envoyée" : "Demander l'activation"}
                  onPress={() => demanderActivation(palier as PackPayant)}
                  chargement={demandeEnCours === palier}
                  disabled={planEffectif === palier || demandeEnvoyee === palier}
                  variante={palier === "business" ? "primaire" : "contour"}
                  className="mt-4"
                />
              )}
            </Carte>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
