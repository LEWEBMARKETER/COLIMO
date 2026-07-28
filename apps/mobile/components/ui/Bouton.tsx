import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variante = "primaire" | "contour" | "blanc";

interface BoutonProps extends Omit<PressableProps, "className"> {
  label: string;
  variante?: Variante;
  chargement?: boolean;
  className?: string;
}

const STYLES_FOND: Record<Variante, string> = {
  primaire: "bg-colimo-rouge",
  contour: "border border-colimo-neutre-clair bg-white",
  blanc: "bg-white",
};

const STYLES_TEXTE: Record<Variante, string> = {
  primaire: "text-white",
  contour: "text-colimo-neutre-fonce",
  blanc: "text-colimo-noir",
};

export default function Bouton({
  label,
  variante = "primaire",
  chargement = false,
  disabled,
  className = "",
  ...pressableProps
}: BoutonProps) {
  const desactive = Boolean(disabled) || chargement;

  return (
    <Pressable
      disabled={desactive}
      className={`flex-row items-center justify-center rounded-full py-4 ${
        desactive ? "bg-colimo-neutre-clair" : STYLES_FOND[variante]
      } ${className}`}
      {...pressableProps}
    >
      {chargement && (
        <ActivityIndicator color={variante === "primaire" ? "white" : "#C41E24"} className="mr-2" />
      )}
      <Text
        className={`text-center font-texte-medium text-base ${
          desactive ? "text-colimo-neutre-fonce/50" : STYLES_TEXTE[variante]
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
