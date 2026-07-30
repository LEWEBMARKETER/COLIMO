import { Text, View } from "react-native";
import { formatFCFA, type PricingResult } from "@colimo/shared";
import Carte from "./ui/Carte";

interface PriceSummaryProps {
  pricing: PricingResult;
  reduction?: number;
}

export default function PriceSummary({ pricing, reduction = 0 }: PriceSummaryProps) {
  const totalFinal = Math.max(pricing.total - reduction, 0);

  return (
    <Carte>
      <View className="flex-row justify-between">
        <Text className="font-texte text-sm text-colimo-neutre-fonce/70">Tarif de base</Text>
        <Text className="font-texte text-sm text-colimo-neutre-fonce">{formatFCFA(pricing.prixSuggere)}</Text>
      </View>
      {pricing.supplementPrioritaire > 0 && (
        <View className="mt-1 flex-row justify-between">
          <Text className="font-texte text-sm text-colimo-neutre-fonce/70">Livraison prioritaire</Text>
          <Text className="font-texte text-sm text-colimo-neutre-fonce">
            +{formatFCFA(pricing.supplementPrioritaire)}
          </Text>
        </View>
      )}
      {pricing.assurance > 0 && (
        <View className="mt-1 flex-row justify-between">
          <Text className="font-texte text-sm text-colimo-neutre-fonce/70">Assurance colis</Text>
          <Text className="font-texte text-sm text-colimo-neutre-fonce">+{formatFCFA(pricing.assurance)}</Text>
        </View>
      )}
      {reduction > 0 && (
        <View className="mt-1 flex-row justify-between">
          <Text className="font-texte text-sm text-colimo-rouge">Code promo</Text>
          <Text className="font-texte text-sm text-colimo-rouge">-{formatFCFA(reduction)}</Text>
        </View>
      )}
      <View className="mt-3 flex-row justify-between border-t border-colimo-neutre-clair pt-3">
        <Text className="font-titre text-colimo-neutre-fonce">Total</Text>
        <Text className="font-titre text-colimo-rouge">{formatFCFA(totalFinal)}</Text>
      </View>
    </Carte>
  );
}
