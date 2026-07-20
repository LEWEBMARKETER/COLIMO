import { Text, View } from "react-native";
import { formatFCFA, type PricingResult } from "@colimo/shared";

export default function PriceSummary({ pricing }: { pricing: PricingResult }) {
  return (
    <View className="rounded-2xl border border-colimo-neutre-clair bg-white p-4">
      <View className="flex-row justify-between">
        <Text className="text-sm text-colimo-neutre-fonce/70">Tarif de base</Text>
        <Text className="text-sm text-colimo-neutre-fonce">{formatFCFA(pricing.prixSuggere)}</Text>
      </View>
      {pricing.supplementPrioritaire > 0 && (
        <View className="mt-1 flex-row justify-between">
          <Text className="text-sm text-colimo-neutre-fonce/70">Livraison prioritaire</Text>
          <Text className="text-sm text-colimo-neutre-fonce">+{formatFCFA(pricing.supplementPrioritaire)}</Text>
        </View>
      )}
      {pricing.assurance > 0 && (
        <View className="mt-1 flex-row justify-between">
          <Text className="text-sm text-colimo-neutre-fonce/70">Assurance colis</Text>
          <Text className="text-sm text-colimo-neutre-fonce">+{formatFCFA(pricing.assurance)}</Text>
        </View>
      )}
      <View className="mt-3 flex-row justify-between border-t border-colimo-neutre-clair pt-3">
        <Text className="font-titre font-semibold text-colimo-neutre-fonce">Total</Text>
        <Text className="font-titre font-semibold text-colimo-rouge">{formatFCFA(pricing.total)}</Text>
      </View>
    </View>
  );
}
