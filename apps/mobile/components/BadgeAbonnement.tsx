import { Text, View } from "react-native";
import { SUBSCRIPTION_PLAN_LABELS, type SubscriptionPlan } from "@colimo/shared";

const TEINTES: Record<SubscriptionPlan, { fond: string; texte: string }> = {
  gratuit: { fond: "#F1EDEA", texte: "#44403C" },
  starter: { fond: "#DBEAFE", texte: "#1E40AF" },
  business: { fond: "#FEF3C7", texte: "#92400E" },
};

interface BadgeAbonnementProps {
  plan: SubscriptionPlan;
  dateExpiration?: string | null;
}

export default function BadgeAbonnement({ plan, dateExpiration }: BadgeAbonnementProps) {
  const teinte = TEINTES[plan];
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ backgroundColor: teinte.fond }} className="self-start rounded-full px-3 py-1">
        <Text style={{ color: teinte.texte }} className="font-texte-medium text-xs uppercase tracking-wide">
          {SUBSCRIPTION_PLAN_LABELS[plan]}
        </Text>
      </View>
      {plan !== "gratuit" && dateExpiration && (
        <Text className="font-texte text-xs text-colimo-neutre-fonce/50">
          Expire le {new Date(dateExpiration).toLocaleDateString("fr-FR")}
        </Text>
      )}
    </View>
  );
}
