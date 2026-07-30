import { View, type ViewProps } from "react-native";

interface CarteProps extends ViewProps {
  sombre?: boolean;
  className?: string;
}

export default function Carte({ sombre = false, className = "", children, ...viewProps }: CarteProps) {
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
