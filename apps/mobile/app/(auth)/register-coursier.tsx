import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ZONE_LABELS, type VehiculeType, type Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import { inscrireCoursier } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

const VEHICULES: { valeur: VehiculeType; label: string }[] = [
  { valeur: "moto", label: "Moto" },
  { valeur: "velo", label: "Vélo" },
  { valeur: "voiture", label: "Voiture" },
  { valeur: "pied", label: "À pied" },
];

export default function RegisterCoursierScreen() {
  const { setRole, setCourierUserId } = useRole();

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [typeVehicule, setTypeVehicule] = useState<VehiculeType | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const peutEnvoyer = Boolean(nom.trim() && telephone.trim() && zone && typeVehicule && documents.length > 0);

  // Pas d'intégration Supabase Storage pour l'instant : on simule l'ajout de
  // pièces justificatives (CNI, permis...) sans upload réel.
  function ajouterDocument() {
    setDocuments((prev) => [...prev, `document_${prev.length + 1}.jpg`]);
  }

  function retirerDocument(index: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  async function envoyer() {
    if (!zone || !typeVehicule) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      const { utilisateur } = await inscrireCoursier({ nom, telephone, zone, typeVehicule, documents });
      setCourierUserId(utilisateur.id);
      setRole("coursier");
      router.replace("/(coursier)/dashboard");
    } catch {
      setErreur("Impossible d'envoyer l'inscription. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl font-semibold text-colimo-neutre-fonce">
          Inscription coursier
        </Text>
        <Text className="mt-1 text-colimo-neutre-fonce/70">
          Votre compte sera validé par COLIMO avant de pouvoir accepter des courses
        </Text>

        <Text className="mb-2 mt-6 text-sm font-medium text-colimo-neutre-fonce">Nom complet</Text>
        <TextInput
          value={nom}
          onChangeText={setNom}
          placeholder="Votre nom"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Téléphone</Text>
        <TextInput
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
          className="mb-4 rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3 text-colimo-neutre-fonce"
        />

        <ZoneSelector label="Zone d'activité" value={zone} onChange={setZone} />

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">Type de véhicule</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {VEHICULES.map((v) => {
            const selectionne = typeVehicule === v.valeur;
            return (
              <Pressable
                key={v.valeur}
                onPress={() => setTypeVehicule(v.valeur)}
                className={`rounded-full border px-4 py-2 ${
                  selectionne ? "border-colimo-rouge bg-colimo-rouge" : "border-colimo-neutre-clair bg-white"
                }`}
              >
                <Text className={selectionne ? "text-white" : "text-colimo-neutre-fonce"}>{v.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-medium text-colimo-neutre-fonce">
          Pièces justificatives (CNI, permis...)
        </Text>
        {documents.map((doc, index) => (
          <View
            key={doc}
            className="mb-2 flex-row items-center justify-between rounded-xl border border-colimo-neutre-clair bg-white px-4 py-3"
          >
            <Text className="text-colimo-neutre-fonce">{doc}</Text>
            <Pressable onPress={() => retirerDocument(index)}>
              <Text className="text-colimo-rouge">Retirer</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={ajouterDocument}
          className="mb-4 rounded-xl border border-dashed border-colimo-neutre-clair py-3"
        >
          <Text className="text-center text-colimo-neutre-fonce/70">+ Ajouter un document</Text>
        </Pressable>

        {zone && (
          <Text className="mb-4 text-xs text-colimo-neutre-fonce/50">
            Zone sélectionnée : {ZONE_LABELS[zone]}
          </Text>
        )}

        {erreur && <Text className="mb-4 text-sm text-colimo-rouge">{erreur}</Text>}

        <Pressable
          disabled={!peutEnvoyer || envoiEnCours}
          onPress={envoyer}
          className={`mb-8 flex-row items-center justify-center rounded-xl py-4 ${
            peutEnvoyer ? "bg-colimo-rouge" : "bg-colimo-neutre-clair"
          }`}
        >
          {envoiEnCours && <ActivityIndicator color="white" className="mr-2" />}
          <Text className={`text-center font-semibold ${peutEnvoyer ? "text-white" : "text-colimo-neutre-fonce/50"}`}>
            Envoyer mon inscription
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
