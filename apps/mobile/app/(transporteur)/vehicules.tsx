import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { TYPE_VEHICULE_TRANSPORT_LABELS, type TypeVehiculeTransport, type VehiculeTransporteur } from "@colimo/shared";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { ajouterVehiculeTransporteur, getMesVehicules } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const TYPES_VEHICULE = (Object.keys(TYPE_VEHICULE_TRANSPORT_LABELS) as TypeVehiculeTransport[]).map((valeur) => ({
  valeur,
  label: TYPE_VEHICULE_TRANSPORT_LABELS[valeur],
}));

const TEINTES_VERIFICATION: Record<string, { fond: string; texte: string; label: string }> = {
  en_attente: { fond: "#FEF3C7", texte: "#92400E", label: "En attente" },
  valide: { fond: "#D1FAE5", texte: "#065F46", label: "Validé" },
  rejete: { fond: "#FBE7E7", texte: "#9E1419", label: "Rejeté" },
};

function PastilleVerification({ statut }: { statut: string }) {
  const teinte = TEINTES_VERIFICATION[statut] ?? TEINTES_VERIFICATION.en_attente;
  return (
    <View style={{ backgroundColor: teinte.fond }} className="self-start rounded-full px-2.5 py-1">
      <Text style={{ color: teinte.texte }} className="font-texte-medium text-xs">
        {teinte.label}
      </Text>
    </View>
  );
}

// Flotte d'un transporteur (COLIMO TRANSPORT, Phase 1) — table 1-N
// vehicules_transporteur, contrairement au coursier moto qui n'a qu'un
// seul type_vehicule sur sa propre ligne (décision produit : "plusieurs
// véhicules" dès le MVP).
export default function MesVehiculesScreen() {
  const { utilisateur, transporteur } = useAuth();
  const [vehicules, setVehicules] = useState<VehiculeTransporteur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);

  const [typeVehicule, setTypeVehicule] = useState<TypeVehiculeTransport | null>(null);
  const [plaque, setPlaque] = useState("");
  const [capacitePoids, setCapacitePoids] = useState("");
  const [capaciteVolume, setCapaciteVolume] = useState("");
  const [document, setDocument] = useState<{ uri: string; mimeType: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function charger() {
    if (!transporteur) return;
    setChargement(true);
    getMesVehicules(transporteur.id)
      .then(setVehicules)
      .finally(() => setChargement(false));
  }

  useFocusEffect(
    useCallback(() => {
      charger();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transporteur?.id])
  );

  const peutEnvoyer = Boolean(typeVehicule && plaque.trim() && !envoiEnCours);

  async function ajouter() {
    if (!transporteur || !utilisateur || !typeVehicule || !plaque.trim()) return;
    setEnvoiEnCours(true);
    setErreur(null);
    try {
      await ajouterVehiculeTransporteur({
        utilisateurId: utilisateur.id,
        transporteurId: transporteur.id,
        typeVehicule,
        plaqueImmatriculation: plaque.trim(),
        capacitePoidsKg: capacitePoids.trim() ? Number(capacitePoids) : undefined,
        capaciteVolumeM3: capaciteVolume.trim() ? Number(capaciteVolume) : undefined,
        document: document ?? undefined,
      });
      setTypeVehicule(null);
      setPlaque("");
      setCapacitePoids("");
      setCapaciteVolume("");
      setDocument(null);
      setFormulaireOuvert(false);
      charger();
    } catch {
      setErreur("Impossible d'ajouter ce véhicule. Réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        {chargement ? null : vehicules.length === 0 && !formulaireOuvert ? (
          <Text className="mt-4 text-center font-texte text-sm text-colimo-neutre-fonce/50">
            Aucun véhicule enregistré pour l&apos;instant.
          </Text>
        ) : (
          vehicules.map((v) => (
            <Carte key={v.id} className="mb-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-titre-bold text-base text-colimo-neutre-fonce">
                  {TYPE_VEHICULE_TRANSPORT_LABELS[v.typeVehicule]}
                </Text>
                <PastilleVerification statut={v.statutVerification} />
              </View>
              <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">{v.plaqueImmatriculation}</Text>
              {(v.capacitePoidsKg || v.capaciteVolumeM3) && (
                <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/50">
                  {v.capacitePoidsKg ? `${v.capacitePoidsKg} kg` : null}
                  {v.capacitePoidsKg && v.capaciteVolumeM3 ? " · " : null}
                  {v.capaciteVolumeM3 ? `${v.capaciteVolumeM3} m³` : null}
                </Text>
              )}
            </Carte>
          ))
        )}

        {formulaireOuvert ? (
          <Carte className="mt-4">
            <Text className="font-titre-bold text-base text-colimo-neutre-fonce">Ajouter un véhicule</Text>

            <GroupePastilles
              label="Type de véhicule"
              options={TYPES_VEHICULE}
              value={typeVehicule}
              onChange={setTypeVehicule}
              className="mt-4"
            />

            <ChampTexte label="Plaque d'immatriculation" value={plaque} onChangeText={setPlaque} placeholder="Ex : GA-1234-AB" />

            <ChampTexte
              label="Capacité poids (kg, optionnel)"
              value={capacitePoids}
              onChangeText={setCapacitePoids}
              keyboardType="numeric"
              placeholder="0"
            />

            <ChampTexte
              label="Capacité volume (m³, optionnel)"
              value={capaciteVolume}
              onChangeText={setCapaciteVolume}
              keyboardType="numeric"
              placeholder="0"
            />

            <PhotoPicker
              label="Document du véhicule (optionnel — carte grise, assurance...)"
              uri={document?.uri ?? null}
              onChange={(uri, mimeType) => setDocument({ uri, mimeType })}
              rond={false}
            />

            {erreur && <Text className="mb-2 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

            <Bouton label="Ajouter ce véhicule" onPress={ajouter} disabled={!peutEnvoyer} chargement={envoiEnCours} className="mt-2" />
            <Bouton
              label="Annuler"
              variante="contour"
              onPress={() => setFormulaireOuvert(false)}
              disabled={envoiEnCours}
              className="mt-2"
            />
          </Carte>
        ) : (
          <Bouton label="Ajouter un véhicule" onPress={() => setFormulaireOuvert(true)} className="mt-4" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
