import { View, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface CarteProps extends ViewProps {
  sombre?: boolean;
  // Variante dégradée de "sombre" (même dégradé que FondDegrade, accueil.tsx)
  // — pour une carte sombre qui mérite plus de relief qu'un aplat (ex. un
  // chiffre-clé mis en avant). Sans effet si sombre=false.
  degrade?: boolean;
  className?: string;
}

export default function Carte({ sombre = false, degrade = false, className = "", children, ...viewProps }: CarteProps) {
  if (sombre && degrade) {
    return (
      <View className={`overflow-hidden rounded-2xl ${className}`} {...viewProps}>
        <LinearGradient
          colors={["#18140F", "#26201A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        <View className="p-4">{children}</View>
      </View>
    );
  }

  return (
    <View
      className={`rounded-2xl p-4 ${
        sombre ? "bg-colimo-noir-clair" : "border border-colimo-neutre-clair bg-white"
      } ${className}`}
      {...viewProps}
    >
      {children}
    </View>
  );
}
