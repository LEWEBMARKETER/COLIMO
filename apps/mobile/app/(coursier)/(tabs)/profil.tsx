import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { VehiculeType, Zone } from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import ZoneSelectorMultiple from "@/components/ZoneSelectorMultiple";
import PhotoPicker from "@/components/PhotoPicker";
import ParametresCompte from "@/components/ParametresCompte";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { patchCoursier, updateUtilisateur, uploaderAvatar } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const VEHICULES: { valeur: VehiculeType; label: string }[] = [
  { valeur: "moto", label: "Moto" },
  { valeur: "velo", label: "Vélo" },
  { valeur: "voiture", label: "Voiture" },
  { valeur: "pied", label: "À pied" },
];

const LABELS_VERIFICATION: Record<string, string> = {
  valide: "Validé ✓",
  rejete: "Rejeté",
  en_attente: "En attente de validation",
};

export default function ProfilCoursierScreen() {
  const { session, utilisateur, coursier, refreshProfile } = useAuth();
  const [prenom, setPrenom] = useState(utilisateur?.prenom ?? "");
  const [nom, setNom] = useState(utilisateur?.nom ?? "");
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? "");
  const [zone, setZone] = useState<Zone | null>(utilisateur?.zone ?? null);
  const [zonesCouvertes, setZonesCouvertes] = useState<Zone[]>(coursier?.zonesCouvertes ?? []);
  const [typeVehicule, setTypeVehicule] = useState<VehiculeType | null>(coursier?.typeVehicule ?? null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const peutEnregistrer = Boolean(
    prenom.trim() && nom.trim() && telephone.trim() && zone && typeVehicule && !enregistrement
  );

  async function enregistrer() {
    if (!session || !coursier || !zone || !typeVehicule) return;
    setEnregistrement(true);
    setErreur(null);
    setSucces(false);
    try {
      const photoUrl = photo ? await uploaderAvatar(session.user.id, photo.uri, photo.mimeType) : undefined;
      await updateUtilisateur(session.user.id, { prenom, nom, telephone, zone, photoUrl });
      await patchCoursier(coursier.id, { typeVehicule, zonesCouvertes });
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
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="flex-row items-center justify-between">
          <Text className="font-titre text-2xl text-colimo-neutre-fonce">Mon profil</Text>
          <View
            className={`rounded-full px-3 py-1 ${
              coursier?.statutVerification === "valide" ? "bg-emerald-50" : "bg-colimo-rouge-clair"
            }`}
          >
            <Text
              className={`font-texte-medium text-xs ${
                coursier?.statutVerification === "valide" ? "text-emerald-700" : "text-colimo-rouge"
              }`}
            >
              {coursier?.statutVerification ? LABELS_VERIFICATION[coursier.statutVerification] : "—"}
            </Text>
          </View>
        </View>

        <View className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <PhotoPicker
            label="Photo de profil"
            uri={photo?.uri ?? utilisateur?.photoUrl ?? null}
            onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
          />

          <ChampTexte label="Prénom" value={prenom} onChangeText={setPrenom} placeholder="Votre prénom" />
          <ChampTexte label="Nom" value={nom} onChangeText={setNom} placeholder="Votre nom" />
          <ChampTexte
            label="Téléphone"
            value={telephone}
            onChangeText={setTelephone}
            keyboardType="phone-pad"
            placeholder="+241 XX XXX XXX"
          />

          <ZoneSelector label="Zone principale" value={zone} onChange={setZone} />
          <ZoneSelectorMultiple
            label="Zones couvertes (voir les demandes de ces zones)"
            value={zonesCouvertes}
            onChange={setZonesCouvertes}
          />
          <GroupePastilles label="Type de véhicule" options={VEHICULES} value={typeVehicule} onChange={setTypeVehicule} />

          <Text className="mb-2 font-texte text-xs text-colimo-neutre-fonce/50">Email : {session?.user.email}</Text>

          {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}
          {succes && <Text className="mb-2 font-texte text-sm text-green-700">Informations enregistrées ✓</Text>}

          <Bouton label="Enregistrer" onPress={enregistrer} disabled={!peutEnregistrer} chargement={enregistrement} />
        </View>

        <ParametresCompte />
      </ScrollView>
    </SafeAreaView>
  );
}
