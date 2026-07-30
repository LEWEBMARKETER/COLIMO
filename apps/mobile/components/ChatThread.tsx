import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { messageFromRow, type Message, type MessageRow } from "@colimo/shared";
import { getMessages, envoyerMessage } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import Bouton from "./ui/Bouton";

interface ChatThreadProps {
  courseId: string;
  moiId: string;
}

interface MessageEnAttente {
  id: string;
  contenu: string;
}

export default function ChatThread({ courseId, moiId }: ChatThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [enAttente, setEnAttente] = useState<MessageEnAttente[]>([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const listeRef = useRef<FlatList<Message | MessageEnAttente>>(null);

  useEffect(() => {
    let annule = false;
    let chargeAvecSucces = false;

    function purgerEnAttente(liste: Message[]) {
      setEnAttente((prev) => prev.filter((p) => !liste.some((m) => m.auteurId === moiId && m.contenu === p.contenu)));
    }

    async function charger() {
      try {
        const donnees = await getMessages(courseId);
        if (annule) return;
        setMessages(donnees);
        purgerEnAttente(donnees);
        setErreurChargement(null);
        chargeAvecSucces = true;
      } catch (e) {
        if (!annule && !chargeAvecSucces) {
          setErreurChargement(e instanceof Error ? e.message : "Impossible de charger la discussion.");
        }
      } finally {
        if (!annule) setChargement(false);
      }
    }

    charger();
    // Filet de secours si Realtime n'est pas disponible (ou pas encore
    // configuré côté Supabase) : on republie la conversation régulièrement.
    const intervalle = setInterval(charger, 4000);

    const channel = supabase
      .channel(`messages-course-${courseId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          const nouveau = messageFromRow(payload.new as MessageRow);
          setMessages((prev) => (prev.some((m) => m.id === nouveau.id) ? prev : [...prev, nouveau]));
          purgerEnAttente([nouveau]);
        }
      )
      .subscribe();

    return () => {
      annule = true;
      clearInterval(intervalle);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moiId]);

  async function envoyer() {
    const contenu = texte.trim();
    if (!contenu) return;
    setTexte("");
    setErreurEnvoi(null);
    const idTemp = `tmp-${Date.now()}`;
    setEnAttente((prev) => [...prev, { id: idTemp, contenu }]);
    try {
      await envoyerMessage({ courseId, auteurId: moiId, contenu });
    } catch (e) {
      setEnAttente((prev) => prev.filter((m) => m.id !== idTemp));
      setErreurEnvoi(e instanceof Error ? e.message : "Impossible d'envoyer le message.");
    }
  }

  if (chargement) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#C41E24" />
      </View>
    );
  }

  if (erreurChargement) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-texte text-sm text-colimo-rouge">{erreurChargement}</Text>
      </View>
    );
  }

  const donneesAffichees: (Message | MessageEnAttente)[] = [...messages, ...enAttente];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
      <FlatList
        ref={listeRef}
        data={donneesAffichees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => listeRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text className="mt-6 text-center font-texte text-colimo-neutre-fonce/60">
            Aucun message pour l&apos;instant
          </Text>
        }
        renderItem={({ item }) => {
          const enCours = "id" in item && item.id.startsWith("tmp-");
          const auteurId = "auteurId" in item ? item.auteurId : moiId;
          const estMoi = auteurId === moiId;
          return (
            <View
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${enCours ? "opacity-60" : ""} ${
                estMoi ? "self-end bg-colimo-rouge" : "self-start border border-colimo-neutre-clair bg-white"
              }`}
            >
              <Text className={`font-texte ${estMoi ? "text-white" : "text-colimo-neutre-fonce"}`}>
                {item.contenu}
              </Text>
            </View>
          );
        }}
      />
      {erreurEnvoi && <Text className="px-4 pb-1 font-texte text-xs text-colimo-rouge">{erreurEnvoi}</Text>}
      <View className="flex-row items-center gap-2 border-t border-colimo-neutre-clair bg-colimo-fond px-4 py-3">
        <TextInput
          value={texte}
          onChangeText={setTexte}
          placeholder="Votre message..."
          className="flex-1 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 font-texte text-colimo-neutre-fonce"
        />
        <Bouton label="Envoyer" onPress={envoyer} className="w-auto px-5 py-3" />
      </View>
    </KeyboardAvoidingView>
  );
}
