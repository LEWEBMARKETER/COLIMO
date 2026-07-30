import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import { updateUtilisateur, uploaderAvatar } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function ProfilClientScreen() {
  const { session, utilisateur, refreshProfile } = useAuth();
  const [nom, setNom] = useState(utilisateur?.nom ?? "");
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? "");
  const [zone, setZone] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const estCommerce = utilisateur?.typeClient === "commerce";
  const peutEnregistrer = Boolean(nom.trim() && telephone.trim() && !enregistrement);

  async function enregistrer() {
    if (!session) return;
    setEnregistrement(true);
    setErreur(null);
    setSucces(false);
    try {
      const photoUrl = photo ? await uploaderAvatar(session.user.id, photo.uri, photo.mimeType) : undefined;
      await updateUtilisateur(session.user.id, {
        nom,
        telephone,
        zone: zone ?? undefined,
        photoUrl,
      });
      await refreshProfile();
      setPhoto(null);
      setSucces(true);
    } catch {
      setErreur("Impossible d'enregistrer vos informations. Réessayez.");
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <PhotoPicker
          label={estCommerce ? "Logo du commerce" : "Photo de profil"}
          uri={photo?.uri ?? utilisateur?.photoUrl ?? null}
          onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
        />

        <ChampTexte
          label={estCommerce ? "Nom du commerce" : "Nom complet"}
          value={nom}
          onChangeText={setNom}
          placeholder={estCommerce ? "Nom de votre commerce" : "Votre nom"}
        />

        <ChampTexte
          label="Téléphone"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
        />

        <ZoneSelector label="Zone" value={zone} onChange={setZone} />

        <Text className="mb-6 font-texte text-xs text-colimo-neutre-fonce/50">Email : {session?.user.email}</Text>

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
        {succes && <Text className="mb-4 font-texte text-sm text-green-700">Informations enregistrées ✓</Text>}

        <Bouton
          label="Enregistrer"
          onPress={enregistrer}
          disabled={!peutEnregistrer}
          chargement={enregistrement}
          className="mb-8"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
