import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { inscrireClient } from "@/lib/api";
import { notifierEvenement } from "@/lib/communication";
import {
  ACTIVITE_COMMERCE_LABELS,
  VOLUME_LIVRAISONS_LABELS,
  type ActiviteCommerce,
  type TypeClient,
  type VolumeLivraisons,
  type Zone,
} from "@colimo/shared";

const TYPES_CLIENT: { valeur: TypeClient; label: string }[] = [
  { valeur: "particulier", label: "Particulier" },
  { valeur: "commerce", label: "Commerce" },
];

const ACTIVITES: { valeur: ActiviteCommerce; label: string }[] = (
  Object.keys(ACTIVITE_COMMERCE_LABELS) as ActiviteCommerce[]
).map((valeur) => ({ valeur, label: ACTIVITE_COMMERCE_LABELS[valeur] }));

const VOLUMES: { valeur: VolumeLivraisons; label: string }[] = (
  Object.keys(VOLUME_LIVRAISONS_LABELS) as VolumeLivraisons[]
).map((valeur) => ({ valeur, label: VOLUME_LIVRAISONS_LABELS[valeur] }));

export default function RegisterClientScreen() {
  const [typeClient, setTypeClient] = useState<TypeClient>("particulier");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState<Zone | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [responsable, setResponsable] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [activite, setActivite] = useState<ActiviteCommerce | null>(null);
  const [volumeQuotidien, setVolumeQuotidien] = useState<VolumeLivraisons | null>(null);
  const [photoCommerce, setPhotoCommerce] = useState<{ uri: string; mimeType: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutEnvoyer = Boolean(nom.trim() && telephone.trim() && email.trim() && password.length >= 6);

  async function envoyer() {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const utilisateur = await inscrireClient({
        email,
        password,
        nom,
        telephone,
        typeClient,
        zone: zone ?? undefined,
        photo: photo ?? undefined,
        responsable: typeClient === "commerce" ? responsable || undefined : undefined,
        whatsapp: typeClient === "commerce" ? whatsapp || undefined : undefined,
        activite: typeClient === "commerce" ? activite ?? undefined : undefined,
        volumeQuotidien: typeClient === "commerce" ? volumeQuotidien ?? undefined : undefined,
        photoCommerce: typeClient === "commerce" ? photoCommerce ?? undefined : undefined,
      });
      await notifierEvenement("compte_bienvenue", {
        declenchePar: utilisateur.id,
        destinataire: email,
        utilisateurId: utilisateur.id,
        variables: { prenom: nom },
      });
      router.replace("/");
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : null;
      setErreur(message ? `Impossible de créer le compte : ${message}` : "Impossible de créer le compte. Vérifiez vos informations.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <ScrollView className="flex-1 px-6 py-6">
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Créer un compte client</Text>

        <GroupePastilles
          label="Type de compte"
          options={TYPES_CLIENT}
          value={typeClient}
          onChange={setTypeClient}
          className="mt-6"
        />

        <ChampTexte
          label={typeClient === "commerce" ? "Nom du commerce" : "Nom complet"}
          value={nom}
          onChangeText={setNom}
          placeholder={typeClient === "commerce" ? "Nom de votre commerce" : "Votre nom"}
        />

        <ChampTexte
          label="Téléphone"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
          placeholder="+241 XX XXX XXX"
        />

        {typeClient === "commerce" && (
          <ChampTexte
            label="Nom du responsable (optionnel)"
            value={responsable}
            onChangeText={setResponsable}
            placeholder="Personne à contacter"
          />
        )}

        <ChampTexte
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="vous@exemple.com"
        />

        {typeClient === "commerce" && (
          <ChampTexte
            label="WhatsApp (optionnel)"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            placeholder="+241 XX XXX XXX"
          />
        )}

        <ChampTexte
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="6 caractères minimum"
        />

        <ZoneSelector label="Zone (optionnel)" value={zone} onChange={setZone} />

        {typeClient === "commerce" && (
          <>
            <GroupePastilles label="Activité" options={ACTIVITES} value={activite} onChange={setActivite} />
            <GroupePastilles
              label="Combien de livraisons effectuez-vous par jour ?"
              options={VOLUMES}
              value={volumeQuotidien}
              onChange={setVolumeQuotidien}
            />
          </>
        )}

        <PhotoPicker
          label={typeClient === "commerce" ? "Logo du commerce (optionnel)" : "Photo de profil (optionnel)"}
          uri={photo?.uri ?? null}
          onChange={(uri, mimeType) => setPhoto({ uri, mimeType })}
        />

        {typeClient === "commerce" && (
          <PhotoPicker
            label="Photo du commerce (optionnel)"
            rond={false}
            uri={photoCommerce?.uri ?? null}
            onChange={(uri, mimeType) => setPhotoCommerce({ uri, mimeType })}
          />
        )}

        {erreur && <Text className="mb-4 font-texte text-sm text-colimo-rouge">{erreur}</Text>}

        <Bouton
          label="Créer mon compte"
          onPress={envoyer}
          disabled={!peutEnvoyer}
          chargement={envoiEnCours}
        />

        <Text className="mb-8 mt-3 text-center font-texte text-xs text-colimo-neutre-fonce/50">
          En créant votre compte, vous acceptez nos{" "}
          <Text onPress={() => router.push("/cgu")} className="text-colimo-rouge">
            CGU
          </Text>{" "}
          et notre{" "}
          <Text onPress={() => router.push("/confidentialite")} className="text-colimo-rouge">
            politique de confidentialité
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
