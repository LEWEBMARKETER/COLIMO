import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { messageFromRow, type Message, type MessageRow } from "@colimo/shared";
import { getMessages, envoyerMessage } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

interface ChatThreadProps {
  courseId: string;
  moiId: string;
}

export default function ChatThread({ courseId, moiId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);
  const listeRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    getMessages(courseId).then((donnees) => {
      setMessages(donnees);
      setChargement(false);
    });

    const channel = supabase
      .channel(`messages-course-${courseId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          setMessages((prev) => [...prev, messageFromRow(payload.new as MessageRow)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  async function envoyer() {
    const contenu = texte.trim();
    if (!contenu) return;
    setTexte("");
    await envoyerMessage({ courseId, auteurId: moiId, contenu });
  }

  if (chargement) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <FlatList
        ref={listeRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listeRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text className="mt-6 text-center text-colimo-neutre-fonce/60">Aucun message pour l&apos;instant</Text>
        }
        renderItem={({ item }) => {
          const estMoi = item.auteurId === moiId;
          return (
            <View
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                estMoi ? "self-end bg-colimo-rouge" : "self-start border border-colimo-neutre-clair bg-white"
              }`}
            >
              <Text className={estMoi ? "text-white" : "text-colimo-neutre-fonce"}>{item.contenu}</Text>
            </View>
          );
        }}
      />
      <View className="flex-row items-center gap-2 border-t border-colimo-neutre-clair bg-colimo-fond px-4 py-3">
        <TextInput
          value={texte}
          onChangeText={setTexte}
          placeholder="Votre message..."
          className="flex-1 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />
        <Pressable onPress={envoyer} className="rounded-xl bg-colimo-rouge px-4 py-3">
          <Text className="font-semibold text-white">Envoyer</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
