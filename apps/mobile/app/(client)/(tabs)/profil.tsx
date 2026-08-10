import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ACTIVITE_COMMERCE_LABELS,
  VOLUME_LIVRAISONS_LABELS,
  type ActiviteCommerce,
  type Commercant,
  type VolumeLivraisons,
  type Zone,
} from "@colimo/shared";
import ZoneSelector from "@/components/ZoneSelector";
import PhotoPicker from "@/components/PhotoPicker";
import ParametresCompte from "@/components/ParametresCompte";
import Bouton from "@/components/ui/Bouton";
import ChampTexte from "@/components/ui/ChampTexte";
import GroupePastilles from "@/components/ui/GroupePastilles";
import { getMonCommerce, updateUtilisateur, uploaderAvatar, uploaderPhotoCommerce, upsertCommercant } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const ACTIVITES: { valeur: ActiviteCommerce; label: string }[] = (
  Object.keys(ACTIVITE_COMMERCE_LABELS) as ActiviteCommerce[]
).map((valeur) => ({ valeur, label: ACTIVITE_COMMERCE_LABELS[valeur] }));

const VOLUMES: { valeur: VolumeLivraisons; label: string }[] = (
  Object.keys(VOLUME_LIVRAISONS_LABELS) as VolumeLivraisons[]
).map((valeur) => ({ valeur, label: VOLUME_LIVRAISONS_LABELS[valeur] }));

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

  // Informations complémentaires du commerce — adresse de localisation,
  // responsable, WhatsApp, activité, volume — renseignées à l'inscription
  // mais jamais modifiables depuis l'app jusqu'ici (seul un admin pouvait
  // les corriger depuis le back-office). Les carnets d'adresses/points de
  // départ multiples restent des fonctionnalités Starter/Business à part
  // (packages/shared/src/abonnements) : ceci ne concerne que l'adresse
  // principale et les infos de fiche, disponibles à tous les paliers.
  const [commerce, setCommerce] = useState<Commercant | null>(null);
  const [adresseCommerce, setAdresseCommerce] = useState("");
  const [responsable, setResponsable] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [activite, setActivite] = useState<ActiviteCommerce | null>(null);
  const [volumeQuotidien, setVolumeQuotidien] = useState<VolumeLivraisons | null>(null);
  const [photoCommerce, setPhotoCommerce] = useState<{ uri: string; mimeType: string } | null>(null);

  useEffect(() => {
    if (!session || !estCommerce) return;
    getMonCommerce(session.user.id).then((c) => {
      if (!c) return;
      setCommerce(c);
      setAdresseCommerce(c.adresse ?? "");
      setResponsable(c.responsable ?? "");
      setWhatsapp(c.whatsapp ?? "");
      setActivite(c.activite ?? null);
      setVolumeQuotidien(c.volumeQuotidien ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, estCommerce]);

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

      if (estCommerce) {
        const photoCommerceUrl = photoCommerce
          ? await uploaderPhotoCommerce(session.user.id, photoCommerce.uri, photoCommerce.mimeType)
          : undefined;
        const misAJour = await upsertCommercant({
          utilisateurId: session.user.id,
          adresse: adresseCommerce.trim() || undefined,
          responsable: responsable.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          activite: activite ?? undefined,
          volumeQuotidien: volumeQuotidien ?? undefined,
          photoCommerceUrl,
        });
        setCommerce(misAJour);
        setPhotoCommerce(null);
      }

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
        <Text className="font-titre text-2xl text-colimo-neutre-fonce">Mon profil</Text>

        <View className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
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

          {estCommerce && (
            <>
              <ChampTexte
                label="Adresse de localisation"
                value={adresseCommerce}
                onChangeText={setAdresseCommerce}
                placeholder="Adresse précise de votre commerce"
              />
              <ChampTexte
                label="Nom du responsable"
                value={responsable}
                onChangeText={setResponsable}
                placeholder="Personne à contacter"
              />
              <ChampTexte
                label="WhatsApp"
                value={whatsapp}
                onChangeText={setWhatsapp}
                keyboardType="phone-pad"
                placeholder="+241 XX XXX XXX"
              />
              <GroupePastilles label="Activité" options={ACTIVITES} value={activite} onChange={setActivite} />
              <GroupePastilles
                label="Combien de livraisons effectuez-vous par jour ?"
                options={VOLUMES}
                value={volumeQuotidien}
                onChange={setVolumeQuotidien}
              />
              <PhotoPicker
                label="Photo du commerce"
                rond={false}
                uri={photoCommerce?.uri ?? commerce?.photoCommerceUrl ?? null}
                onChange={(uri, mimeType) => setPhotoCommerce({ uri, mimeType })}
              />
            </>
          )}

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
