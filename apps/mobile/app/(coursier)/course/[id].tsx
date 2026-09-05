import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import {
  COURSE_STATUS_LABELS,
  DEPLACEMENT_MIN_ENVOI_POSITION_M,
  INTERVALLE_ENVOI_POSITION_MS,
  MODE_PAIEMENT_LABELS,
  formatFCFA,
  type Course,
  type CourseStatus,
  type EtatConfirmationCoursier,
  type EvenementCommunication,
} from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import CarteItineraire from "@/components/CarteItineraire";
import BandeauStatut from "@/components/BandeauStatut";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import PreuveLivraisonPicker, { type FichierPreuveLivraison } from "@/components/PreuveLivraisonPicker";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChampTexte from "@/components/ui/ChampTexte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import {
  enregistrerPreuveLivraison,
  getCourse,
  getEtatConfirmationCoursier,
  patchCourse,
  recalculerEtaCourse,
  uploaderPreuveLivraison,
  upsertPositionCoursier,
  verifierOtpLivraison,
} from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/communication";
import { jouerIdentiteSonoreColimo } from "@/lib/sonIdentite";

// "livree" n'est plus atteignable via ce mapping générique : elle ne peut
// désormais être posée que par verifier_otp_livraison (0042), après saisie
// du code de réception par le coursier — cf. panneau "Remettre le colis"
// plus bas. acceptee->retrait->en_cours restent inchangés.
const PROCHAIN_STATUT: Partial<Record<CourseStatus, CourseStatus>> = {
  acceptee: "retrait",
  retrait: "en_cours",
};

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);
const STATUTS_ACTIFS = new Set(["acceptee", "retrait", "en_cours"]);

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, utilisateur } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [maj, setMaj] = useState(false);
  const [etatConfirmation, setEtatConfirmation] = useState<EtatConfirmationCoursier | null>(null);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [verificationEnCours, setVerificationEnCours] = useState(false);
  const [erreurOtp, setErreurOtp] = useState<string | null>(null);
  const [photo, setPhoto] = useState<FichierPreuveLivraison | null>(null);
  const [envoiPreuveEnCours, setEnvoiPreuveEnCours] = useState(false);
  const [erreurPreuve, setErreurPreuve] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCourse(id as string).then(setCourse);
  }, [id]);

  // État de la confirmation (tentatives restantes, preuve déjà envoyée...) —
  // jamais le code lui-même (get_etat_confirmation_coursier, 0042). Rechargé
  // à chaque changement de statut pour reprendre au bon endroit si le
  // coursier quitte puis revient sur l'écran en cours de remise.
  useEffect(() => {
    if (!course || (course.statut !== "en_cours" && course.statut !== "livree")) return;
    getEtatConfirmationCoursier(course.id).then(setEtatConfirmation);
  }, [course?.id, course?.statut]);

  async function verifierCode() {
    if (!course || codeSaisi.trim().length < 4) return;
    setVerificationEnCours(true);
    setErreurOtp(null);
    try {
      const resultat = await verifierOtpLivraison(course.id, codeSaisi.trim());
      if (resultat.valide) {
        setCodeSaisi("");
        jouerIdentiteSonoreColimo();
        const [misAJour, etat] = await Promise.all([getCourse(course.id), getEtatConfirmationCoursier(course.id)]);
        setCourse(misAJour);
        setEtatConfirmation(etat);
      } else {
        setErreurOtp(
          resultat.erreur === "trop_de_tentatives"
            ? "Trop de tentatives incorrectes. Contactez le support COLIMO."
            : resultat.erreur === "expire"
              ? "Ce code a expiré — demandez au client de le renvoyer."
              : `❌ Code incorrect${resultat.tentativesRestantes != null ? ` (${resultat.tentativesRestantes} tentative${resultat.tentativesRestantes > 1 ? "s" : ""} restante${resultat.tentativesRestantes > 1 ? "s" : ""})` : ""}.`
        );
        const etat = await getEtatConfirmationCoursier(course.id);
        setEtatConfirmation(etat);
      }
    } catch (e) {
      setErreurOtp(e instanceof Error ? e.message : "Impossible de vérifier ce code. Réessayez.");
    } finally {
      setVerificationEnCours(false);
    }
  }

  async function envoyerPreuveLivraison() {
    if (!course || !photo) return;
    setEnvoiPreuveEnCours(true);
    setErreurPreuve(null);
    try {
      const { chemin, url } = await uploaderPreuveLivraison(course.id, photo.uri, photo.mimeType);
      await enregistrerPreuveLivraison(course.id, chemin, url);
      setEtatConfirmation(await getEtatConfirmationCoursier(course.id));
    } catch (e) {
      setErreurPreuve(e instanceof Error ? e.message : "Impossible d'envoyer la photo. Réessayez.");
    } finally {
      setEnvoiPreuveEnCours(false);
    }
  }

  // Transmission de la position GPS — uniquement pendant une course active,
  // jamais en arrière-plan une fois celle-ci terminée/annulée. Fréquence
  // native (watchPositionAsync) plutôt qu'un setInterval manuel : au moins
  // toutes les 12s, ou plus tôt en cas de déplacement d'au moins 30m —
  // cf. packages/shared/src/positions/types.ts.
  useEffect(() => {
    if (!session || !course || !STATUTS_ACTIFS.has(course.statut)) return;
    const courseId = course.id;

    let souscription: Location.LocationSubscription | null = null;
    let annule = false;

    async function demarrerSuivi() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || annule) return;

      souscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: INTERVALLE_ENVOI_POSITION_MS,
          distanceInterval: DEPLACEMENT_MIN_ENVOI_POSITION_M,
        },
        async (position) => {
          if (annule || !session) return;
          try {
            await upsertPositionCoursier({
              coursierId: session.user.id,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              precisionM: position.coords.accuracy ?? null,
              vitesseKmh:
                position.coords.speed != null && position.coords.speed >= 0
                  ? position.coords.speed * 3.6
                  : null,
              capDegres: position.coords.heading ?? null,
            });
            // Le serveur applique lui-même le throttle (temps/déplacement) : un
            // appel fréquent ici ne déclenche pas systématiquement un appel
            // Mapbox Directions payant, cf. api/mapbox/directions.
            const misAJour = await recalculerEtaCourse(courseId);
            if (!annule) setCourse(misAJour);
          } catch {
            // Une coupure réseau ponctuelle ne doit jamais interrompre la course.
          }
        }
      );
    }

    demarrerSuivi();

    return () => {
      annule = true;
      souscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, course?.statut, session?.user.id]);

  const EVENEMENT_PAR_STATUT: Partial<Record<CourseStatus, EvenementCommunication>> = {
    retrait: "colis_recupere",
    en_cours: "livraison_en_cours",
  };

  const NOTIFICATION_APP_PAR_STATUT: Partial<Record<CourseStatus, EvenementCommunication>> = {
    retrait: "notification_colis_recupere",
    en_cours: "notification_livraison_en_cours",
  };

  async function marquerProchainStatut() {
    if (!course || !session) return;
    const prochain = PROCHAIN_STATUT[course.statut];
    if (!prochain) return;
    setMaj(true);
    try {
      const misAJour = await patchCourse(course.id, { statut: prochain });
      setCourse(misAJour);
      const evenement = EVENEMENT_PAR_STATUT[prochain];
      if (evenement) {
        await notifierEvenement(evenement, {
          declenchePar: session.user.id,
          destinataire: misAJour.telephoneDestinataire,
          variables: {
            nom_client: misAJour.nomDestinataire ?? "client",
            numero_commande: misAJour.numeroCommande,
            nom_coursier: utilisateur?.prenom ?? utilisateur?.nom ?? "votre coursier",
            telephone: utilisateur?.telephone ?? "",
            temps: "quelques minutes",
          },
        });
      }
      const evenementApp = NOTIFICATION_APP_PAR_STATUT[prochain];
      if (evenementApp) {
        await notifierEvenement(evenementApp, {
          declenchePar: session.user.id,
          destinataire: misAJour.clientId,
          utilisateurId: misAJour.clientId,
          variables: { numero_commande: misAJour.numeroCommande },
        });
      }
    } finally {
      setMaj(false);
    }
  }

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  const prochain = PROCHAIN_STATUT[course.statut];
  const contactsFermes = course.statut === "confirmee";
  const attendOtp = course.statut === "en_cours";
  const attendPreuve = course.statut === "livree" && !!etatConfirmation && !etatConfirmation.preuvePhotoUploadedAt;

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <BandeauStatut statut={course.statut} numeroCommande={course.numeroCommande} />

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <Text className="font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>

        <Carte sombre className="mt-3">
          <View className="flex-row items-end justify-between">
            <ChiffreCle valeur={formatFCFA(course.prix)} label="Prix de la course" sombre />
            <Text className="font-texte text-xs text-white/60">{MODE_PAIEMENT_LABELS[course.modePaiement]}</Text>
          </View>
        </Carte>

        {course.latitudeDepart !== undefined &&
          course.longitudeDepart !== undefined &&
          course.latitudeArrivee !== undefined &&
          course.longitudeArrivee !== undefined && (
            <View className="mt-3">
              <CarteItineraire
                depart={{ latitude: course.latitudeDepart, longitude: course.longitudeDepart }}
                arrivee={{ latitude: course.latitudeArrivee, longitude: course.longitudeArrivee }}
                labelDepart="Expéditeur"
                labelArrivee="Destinataire"
              />
            </View>
          )}

        <View className="mt-4">
          <ContactCarte
            titre="Expéditeur"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart}
            longitude={course.longitudeDepart}
            appelFerme={contactsFermes}
          />
          <ContactCarte
            titre="Destinataire"
            nom={course.nomDestinataire}
            telephone={course.telephoneDestinataire}
            adresse={course.adresseArrivee}
            repere={course.repereArrivee}
            latitude={course.latitudeArrivee}
            longitude={course.longitudeArrivee}
            appelFerme={contactsFermes}
          />
        </View>

        {course.instructions && (
          <View className="mb-3 rounded-lg border-2 border-colimo-rouge bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline course={course} />
        </View>

        {(course.statut === "livree" || course.statut === "confirmee") && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.clientId}
            titre="Comment s'est passée la course avec ce client ?"
          />
        )}

        {course.statut === "litige" && (
          <Text className="mt-6 text-center font-texte text-sm text-colimo-rouge">
            Ce problème a été signalé à notre équipe, qui va vous contacter pour le résoudre.
          </Text>
        )}
      </ScrollView>

      {(prochain || attendOtp || attendPreuve || !contactsFermes || STATUTS_SIGNALABLES.has(course.statut)) && (
        <View className="border-t-2 border-colimo-neutre-fonce bg-colimo-fond px-6 pb-2 pt-3">
          {attendOtp && (
            <View className="mb-3 rounded-2xl border-2 border-colimo-neutre-fonce bg-white p-4">
              <Text className="font-texte-medium text-sm text-colimo-neutre-fonce">📦 Confirmation de livraison</Text>
              <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/60">
                Demandez le code de réception au client.
              </Text>
              <ChampTexte
                label="Code de réception"
                value={codeSaisi}
                onChangeText={(v) => setCodeSaisi(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="_ _ _ _"
                className="mb-0 mt-3"
                style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }}
              />
              {erreurOtp && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreurOtp}</Text>}
              <Bouton
                label="Vérifier le code"
                onPress={verifierCode}
                chargement={verificationEnCours}
                disabled={codeSaisi.trim().length < 4}
                className="mt-3 py-3.5"
              />
            </View>
          )}

          {attendPreuve && (
            <View className="mb-3 rounded-2xl border-2 border-colimo-neutre-fonce bg-white p-4">
              <Text className="mb-2 font-texte-medium text-sm text-emerald-700">✅ Code valide</Text>
              <PreuveLivraisonPicker value={photo} onChange={setPhoto} />
              {erreurPreuve && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreurPreuve}</Text>}
              <Bouton
                label="Confirmer la livraison"
                onPress={envoyerPreuveLivraison}
                chargement={envoiPreuveEnCours}
                disabled={!photo}
                className="mt-3 py-3.5"
              />
            </View>
          )}

          {(!contactsFermes || STATUTS_SIGNALABLES.has(course.statut)) && (
            <Text className="mb-2 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50">
              {STATUTS_SIGNALABLES.has(course.statut) && (
                <Text onPress={() => router.push(`/(coursier)/litige/${course.id}`)}>Signaler un problème</Text>
              )}
              {STATUTS_SIGNALABLES.has(course.statut) && !contactsFermes && "  ·  "}
              {!contactsFermes && (
                <Text onPress={() => router.push(`/(coursier)/chat/${course.id}`)}>Discuter avec le client</Text>
              )}
            </Text>
          )}
          {prochain && (
            <Bouton
              label={`Marquer « ${COURSE_STATUS_LABELS[prochain]} »`}
              onPress={marquerProchainStatut}
              chargement={maj}
              className="py-4"
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
