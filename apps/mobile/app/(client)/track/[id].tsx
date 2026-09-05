import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  MODE_PAIEMENT_LABELS,
  formatDistanceM,
  formatDureeSecondes,
  formatFCFA,
  peutAnnulerCourse,
  type ConfirmationLivraison,
  type Coursier,
  type Course,
  type PositionCoursier,
  type Utilisateur,
} from "@colimo/shared";
import ContactCarte from "@/components/ContactCarte";
import CarteItineraire from "@/components/CarteItineraire";
import BandeauStatut from "@/components/BandeauStatut";
import StatusTimeline from "@/components/StatusTimeline";
import NotationForm from "@/components/NotationForm";
import NoteEtoiles from "@/components/NoteEtoiles";
import Bouton from "@/components/ui/Bouton";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import {
  confirmerReceptionClient,
  getConfirmationLivraison,
  getCourse,
  getCoursierByUtilisateurId,
  getPositionCoursier,
  getUtilisateur,
  lienSuiviPublic,
  recalculerBadgesEtNiveau,
  renvoyerOtpLivraison,
  souscrirePositionCoursier,
} from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/communication";
import { jouerIdentiteSonoreColimo } from "@/lib/sonIdentite";

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);
const STATUTS_AVEC_POSITION = new Set(["acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINAUX = new Set(["livree", "confirmee", "annulee", "retournee"]);
const STATUTS_AVEC_OTP = new Set(["acceptee", "retrait", "en_cours"]);

export default function TrackScreen() {
  const { session, utilisateur } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [coursier, setCoursier] = useState<Coursier | null>(null);
  const [coursierUtilisateur, setCoursierUtilisateur] = useState<Utilisateur | null>(null);
  const [positionCoursier, setPositionCoursier] = useState<PositionCoursier | null>(null);
  const [recuEnCours, setRecuEnCours] = useState(false);
  const [confirmationLivraison, setConfirmationLivraison] = useState<ConfirmationLivraison | null>(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [erreurRenvoi, setErreurRenvoi] = useState<string | null>(null);
  const [signalementEnCours, setSignalementEnCours] = useState(false);

  async function telechargerRecu() {
    if (!course) return;
    setRecuEnCours(true);
    try {
      const html = `
        <html><body style="font-family: sans-serif; padding: 24px;">
          <h2 style="color:#C41E24;">COLIMO — Reçu de livraison</h2>
          <p><strong>N° commande :</strong> ${course.numeroCommande}</p>
          <p><strong>Date :</strong> ${new Date(course.createdAt).toLocaleString("fr-FR")}</p>
          <p><strong>Statut :</strong> ${COURSE_STATUS_LABELS[course.statut]}</p>
          <hr />
          <p><strong>Récupération :</strong> ${course.adresseDepart}</p>
          <p><strong>Livraison :</strong> ${course.adresseArrivee}${course.nomDestinataire ? ` — ${course.nomDestinataire}` : ""}</p>
          <p><strong>Colis :</strong> ${course.typeColis}</p>
          <hr />
          <p><strong>Montant :</strong> ${formatFCFA(course.prix)}</p>
          <p><strong>Mode de paiement :</strong> ${MODE_PAIEMENT_LABELS[course.modePaiement]}</p>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      }
    } catch {
      // Le reçu est un complément — une erreur ici ne doit rien bloquer d'autre.
    } finally {
      setRecuEnCours(false);
    }
  }

  async function confirmerReception() {
    if (!course || !session) return;
    setConfirmationEnCours(true);
    setErreurConfirmation(null);
    try {
      await confirmerReceptionClient(course.id);
      jouerIdentiteSonoreColimo();
      const misAJour = await getCourse(course.id);
      setCourse(misAJour);
      await notifierEvenement("livraison_terminee", {
        declenchePar: session.user.id,
        destinataire: misAJour.telephoneDestinataire,
        variables: { nom_client: misAJour.nomDestinataire ?? "client" },
      });
      await notifierEvenement("notification_livraison_terminee", {
        declenchePar: session.user.id,
        destinataire: session.user.id,
        utilisateurId: session.user.id,
        variables: { numero_commande: misAJour.numeroCommande },
      });
      if (misAJour.coursierId) {
        await notifierEvenement("notification_livraison_terminee", {
          declenchePar: session.user.id,
          destinataire: misAJour.coursierId,
          utilisateurId: misAJour.coursierId,
          variables: { numero_commande: misAJour.numeroCommande },
        });
        try {
          await recalculerBadgesEtNiveau(misAJour.coursierId);
        } catch {
          // Le recalcul des badges/niveau ne doit jamais bloquer la confirmation de livraison.
        }
      }
    } catch {
      setErreurConfirmation("Impossible de confirmer la réception. Réessayez.");
    } finally {
      setConfirmationEnCours(false);
    }
  }

  useEffect(() => {
    if (!id) return;

    let annule = false;
    async function charger() {
      try {
        const donnees = await getCourse(id as string);
        if (!annule) setCourse(donnees);
      } catch {
        // La course n'est pas (encore) disponible ; on réessaiera au prochain intervalle.
      }
    }

    charger();
    const intervalle = setInterval(charger, 3000);
    return () => {
      annule = true;
      clearInterval(intervalle);
    };
  }, [id]);

  useEffect(() => {
    if (!course?.coursierId) {
      setCoursier(null);
      setCoursierUtilisateur(null);
      return;
    }
    getCoursierByUtilisateurId(course.coursierId).then(setCoursier);
    getUtilisateur(course.coursierId).then(setCoursierUtilisateur);
  }, [course?.coursierId]);

  // Code de réception — jamais visible du coursier (0042). Masqué dès qu'il
  // a été vérifié ou que la livraison est terminée/annulée.
  useEffect(() => {
    if (!course || !STATUTS_AVEC_OTP.has(course.statut)) {
      setConfirmationLivraison(null);
      return;
    }
    let annule = false;
    getConfirmationLivraison(course.id).then((c) => {
      if (!annule) setConfirmationLivraison(c);
    });
    return () => {
      annule = true;
    };
  }, [course?.id, course?.statut]);

  async function renvoyerCode() {
    if (!course) return;
    setRenvoiEnCours(true);
    setErreurRenvoi(null);
    try {
      await renvoyerOtpLivraison(course.id);
      setConfirmationLivraison(await getConfirmationLivraison(course.id));
    } catch (e) {
      setErreurRenvoi(e instanceof Error ? e.message : "Impossible de renvoyer un code pour le moment.");
    } finally {
      setRenvoiEnCours(false);
    }
  }

  async function signalerProbleme() {
    if (course) {
      setSignalementEnCours(true);
      try {
        await confirmerReceptionClient(course.id, true);
      } catch {
        // Le signalement est un complément d'information ; l'ouverture du
        // litige ci-dessous reste la voie de traitement principale.
      } finally {
        setSignalementEnCours(false);
      }
    }
    router.push(`/(client)/litige/${course?.id}`);
  }

  // Position du coursier en temps réel — uniquement pendant une course
  // active (la RLS de positions_coursiers refuse de toute façon l'accès en
  // dehors de ce cas, cf. 0038) : valeur initiale via une lecture directe,
  // puis mises à jour via Supabase Realtime (canal postgres_changes).
  useEffect(() => {
    if (!course?.coursierId || !STATUTS_AVEC_POSITION.has(course.statut)) {
      setPositionCoursier(null);
      return;
    }

    let annule = false;
    getPositionCoursier(course.coursierId).then((position) => {
      if (!annule) setPositionCoursier(position);
    });

    const canal = souscrirePositionCoursier(course.coursierId, (position) => {
      if (!annule) setPositionCoursier(position);
    });

    return () => {
      annule = true;
      supabase.removeChannel(canal);
    };
  }, [course?.coursierId, course?.statut]);

  if (!course) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-colimo-fond">
        <ActivityIndicator color="#C41E24" />
      </SafeAreaView>
    );
  }

  if (course.statut === "en_attente_paiement") {
    return (
      <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
        <BandeauStatut statut={course.statut} numeroCommande={course.numeroCommande} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-titre text-lg text-colimo-neutre-fonce">
            Un dernier pas : réglez les frais de livraison
          </Text>
          <Text className="mt-2 text-center font-texte text-sm text-colimo-neutre-fonce/60">
            Votre course ne sera envoyée aux coursiers qu&apos;une fois le paiement confirmé.
          </Text>
          <Bouton
            label="Payer maintenant"
            onPress={() => router.push(`/(client)/paiement/${course.id}`)}
            className="mt-6 px-8"
          />
          <Bouton
            label="Annuler la course"
            variante="contour"
            onPress={() => router.push(`/(client)/annuler/${course.id}`)}
            className="mt-3 px-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  const contactsFermes = course.statut === "confirmee";

  return (
    <SafeAreaView className="flex-1 bg-colimo-fond" edges={["bottom"]}>
      <BandeauStatut statut={course.statut} numeroCommande={course.numeroCommande} />

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}>
        <View className="flex-row items-center justify-between">
          <Text className="flex-1 font-texte text-colimo-neutre-fonce/70">{course.typeColis}</Text>
          <Text
            onPress={() =>
              Share.share({
                message: `Suivez ma livraison COLIMO (${course.numeroCommande}) en temps réel : ${lienSuiviPublic(course.codeSuivi)}`,
              })
            }
            className="font-texte-medium text-xs text-colimo-rouge"
          >
            Partager le suivi
          </Text>
        </View>

        <Carte sombre className="mt-3">
          <View className="flex-row items-end justify-between">
            <ChiffreCle valeur={formatFCFA(course.prix)} label="Prix" sombre />
            <Text className="font-texte text-xs text-white/60">{MODE_PAIEMENT_LABELS[course.modePaiement]}</Text>
          </View>
        </Carte>

        {confirmationLivraison && !confirmationLivraison.otpVerifieAt && (
          <View className="mt-3 items-center rounded-2xl border-2 border-colimo-rouge bg-white p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
              Votre code de réception
            </Text>
            <Text className="mt-1 font-titre-bold text-3xl text-colimo-rouge" style={{ letterSpacing: 6 }}>
              {confirmationLivraison.codeOtp}
            </Text>
            <Text className="mt-1 text-center font-texte text-xs text-colimo-neutre-fonce/60">
              Communiquez ce code uniquement au coursier lorsque vous recevez votre colis.
            </Text>
            <Text
              onPress={renvoiEnCours ? undefined : renvoyerCode}
              className={`mt-3 font-texte-medium text-xs ${renvoiEnCours ? "text-colimo-neutre-fonce/40" : "text-colimo-rouge"}`}
            >
              🔄 {renvoiEnCours ? "Envoi en cours…" : "Générer/envoyer à nouveau le code"}
            </Text>
            {erreurRenvoi && (
              <Text className="mt-1 text-center font-texte text-xs text-colimo-rouge">{erreurRenvoi}</Text>
            )}
          </View>
        )}

        {course.latitudeDepart !== undefined &&
          course.longitudeDepart !== undefined &&
          course.latitudeArrivee !== undefined &&
          course.longitudeArrivee !== undefined && (
            <View className="mt-3">
              <CarteItineraire
                depart={{ latitude: course.latitudeDepart, longitude: course.longitudeDepart }}
                arrivee={{ latitude: course.latitudeArrivee, longitude: course.longitudeArrivee }}
                positionCoursier={
                  positionCoursier ? { latitude: positionCoursier.latitude, longitude: positionCoursier.longitude } : null
                }
              />
              {(course.distanceRestanteM != null || course.etaSecondes != null) && positionCoursier && (
                <View className="-mt-2 mb-4 flex-row items-center justify-between rounded-2xl bg-colimo-rouge-clair px-4 py-3">
                  <Text className="font-texte-medium text-sm text-colimo-rouge">
                    {course.distanceRestanteM != null ? formatDistanceM(course.distanceRestanteM) : "—"} restants
                  </Text>
                  <Text className="font-texte-medium text-sm text-colimo-rouge">
                    {course.etaSecondes != null ? `~${formatDureeSecondes(course.etaSecondes)}` : "—"}
                  </Text>
                </View>
              )}
            </View>
          )}

        {coursierUtilisateur && (
          <View className="mt-3 rounded-2xl border border-colimo-neutre-clair bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-neutre-fonce/50">
                  Votre coursier
                </Text>
                <Text className="mt-0.5 font-texte-medium text-colimo-neutre-fonce">
                  {coursierUtilisateur.prenom ? `${coursierUtilisateur.prenom} ` : ""}
                  {coursierUtilisateur.nom}
                </Text>
              </View>
              <NoteEtoiles note={coursier?.noteMoyenne ?? 0} />
            </View>
            {coursierUtilisateur.telephone && !contactsFermes && (
              <Bouton
                label={`Appeler ${coursierUtilisateur.prenom ?? coursierUtilisateur.nom}`}
                variante="contour"
                onPress={() => Linking.openURL(`tel:${coursierUtilisateur.telephone}`)}
                className="mt-3 py-2.5"
              />
            )}
          </View>
        )}

        <View className="mt-4">
          <ContactCarte
            titre="Récupération"
            nom={course.nomExpediteur}
            telephone={course.telephoneExpediteur}
            adresse={course.adresseDepart}
            repere={course.repereDepart}
            latitude={course.latitudeDepart}
            longitude={course.longitudeDepart}
            appelFerme={contactsFermes}
          />
          <ContactCarte
            titre="Livraison"
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
          <View className="mb-3 rounded-2xl bg-colimo-rouge-clair p-4">
            <Text className="font-texte-medium text-xs uppercase tracking-wide text-colimo-rouge">Instructions</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce">{course.instructions}</Text>
          </View>
        )}

        <View className="mt-2">
          <StatusTimeline course={course} />
        </View>

        {(course.statut === "livree" || course.statut === "confirmee") && course.coursierId && session && (
          <NotationForm
            courseId={course.id}
            auteurId={session.user.id}
            destinataireId={course.coursierId}
            titre="Comment s'est passée la livraison ?"
          />
        )}

        {course.statut === "litige" && (
          <Text className="mt-6 text-center font-texte text-sm text-colimo-rouge">
            Ce problème a été signalé à notre équipe, qui va vous contacter pour le résoudre.
          </Text>
        )}

        {erreurConfirmation && (
          <Text className="mt-2 text-center font-texte text-xs text-colimo-rouge">{erreurConfirmation}</Text>
        )}
      </ScrollView>

      {(course.statut === "livree" ||
        (course.coursierId && !contactsFermes) ||
        STATUTS_SIGNALABLES.has(course.statut) ||
        peutAnnulerCourse(course)) && (
        <View className="border-t border-colimo-neutre-clair bg-colimo-fond px-6 pb-2 pt-3">
          {(STATUTS_SIGNALABLES.has(course.statut) || (course.coursierId && !contactsFermes)) && (
            <Text className="mb-2 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50">
              {STATUTS_SIGNALABLES.has(course.statut) && (
                <Text onPress={signalerProbleme}>Signaler un problème</Text>
              )}
              {STATUTS_SIGNALABLES.has(course.statut) && course.coursierId && !contactsFermes && "  ·  "}
              {course.coursierId && !contactsFermes && (
                <Text onPress={() => router.push(`/(client)/chat/${course.id}`)}>Discuter avec le coursier</Text>
              )}
            </Text>
          )}
          {course.statut === "livree" && (
            <Bouton
              label="Confirmer la réception du colis"
              onPress={confirmerReception}
              chargement={confirmationEnCours}
              className="py-4"
            />
          )}
          {peutAnnulerCourse(course) && (
            <Bouton
              label="Annuler la course"
              variante="contour"
              onPress={() => router.push(`/(client)/annuler/${course.id}`)}
              className="py-4"
            />
          )}
        </View>
      )}

      {STATUTS_TERMINAUX.has(course.statut) && (
        <View className="border-t border-colimo-neutre-clair bg-colimo-fond px-6 pb-2 pt-3">
          {utilisateur?.typeClient === "commerce" && (
            <Bouton
              label="↻ Refaire cette livraison"
              variante="contour"
              onPress={() => router.push(`/(client)/nouvelle-livraison?depuisCourseId=${course.id}`)}
              className="py-3"
            />
          )}
          <Bouton
            label="Télécharger le reçu"
            variante="contour"
            onPress={telechargerRecu}
            chargement={recuEnCours}
            className="mt-2 py-3"
          />
        </View>
      )}
    </SafeAreaView>
  );
}
