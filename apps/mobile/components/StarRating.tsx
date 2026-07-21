import { Pressable, Text, View } from "react-native";

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((etoile) => (
        <Pressable key={etoile} onPress={() => onChange(etoile)} hitSlop={8}>
          <Text className={etoile <= value ? "text-3xl text-colimo-rouge" : "text-3xl text-colimo-neutre-clair"}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
