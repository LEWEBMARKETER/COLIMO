import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import {
  COURSE_STATUS_LABELS,
  DECISION_ECHEC_LIVRAISON_LABELS,
  MODE_PAIEMENT_LABELS,
  MOTIF_ECHEC_LIVRAISON_LABELS,
  formatDistanceM,
  formatDureeSecondes,
  formatFCFA,
  peutAnnulerCourse,
  recupererEtMarquerNotificationPalier,
  type ConfirmationLivraison,
  type Coursier,
  type Course,
  type DecisionEchecLivraison,
  type EchecLivraison,
  type EvenementCommunication,
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
import BottomSheet from "@/components/ui/BottomSheet";
import Carte from "@/components/ui/Carte";
import ChiffreCle from "@/components/ui/ChiffreCle";
import {
  confirmerReceptionClient,
  getConfirmationLivraison,
  getCourse,
  getCoursierByUtilisateurId,
  getEchecsLivraisonPourCourse,
  getPositionCoursier,
  getUtilisateur,
  lienSuiviPublic,
  recalculerBadgesEtNiveau,
  renvoyerOtpLivraison,
  souscrirePositionCoursier,
  traiterEchecLivraison,
} from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { notifierEvenement } from "@/lib/communication";
import { jouerIdentiteSonoreColimo } from "@/lib/sonIdentite";

const STATUTS_SIGNALABLES = new Set(["acceptee", "retrait", "en_cours", "livree"]);
const STATUTS_AVEC_POSITION = new Set(["acceptee", "retrait", "en_cours"]);
const STATUTS_TERMINAUX = new Set(["livree", "confirmee", "annulee", "retournee"]);
const STATUTS_AVEC_OTP = new Set(["acceptee", "retrait", "en_cours"]);

// Palier -> événement de notification (besoin section 7) — STANDARD n'a
// pas d'entrée : un coursier ne peut jamais "franchir" ce palier de départ
// (cf. ValidationLivraisonModal côté admin, même table).
const EVENEMENT_PAR_PALIER: Record<string, EvenementCommunication> = {
  actif: "coursier_palier_actif",
  pro: "coursier_palier_pro",
  elite: "coursier_palier_elite",
};

// Pastille qui pulse pendant la recherche — indique un processus actif en
// arrière-plan, pas un écran figé (seule animation en boucle de cet écran,
// visible uniquement tant que le bottom sheet de recherche est affiché).
function PointRecherche() {
  const echelle = useSharedValue(1);
  useEffect(() => {
    echelle.value = withRepeat(withTiming(1.6, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [echelle]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  return <Animated.View style={style} className="h-2.5 w-2.5 rounded-full bg-colimo-rouge" />;
}

// Retour transitoire sur "Confirmer la réception du colis" — la seule
// action qui clôture le parcours client, jusqu'ici accompagnée d'un son
// mais d'aucun feedback visuel dédié. Se referme seule (ou au premier tap) ;
// le bandeau de statut et la timeline en dessous restent la source de
// vérité, cet écran ne fait que marquer l'instant où l'action a réussi.
function ConfirmationReception({ onTermine }: { onTermine: () => void }) {
  const echelle = useSharedValue(0.5);

  useEffect(() => {
    echelle.value = withSequence(
      withTiming(1.15, { duration: 220, easing: Easing.out(Easing.ease) }),
      withSpring(1, { damping: 9 })
    );
    const minuteur = setTimeout(onTermine, 2200);
    return () => clearTimeout(minuteur);
  }, [echelle, onTermine]);

  const stylePulsation = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 items-center justify-center bg-black/40 px-8"
    >
      <Pressable onPress={onTermine} className="items-center rounded-2xl bg-white px-8 py-8">
        <Animated.View
          style={stylePulsation}
          className="h-16 w-16 items-center justify-center rounded-full bg-colimo-succes"
        >
          <Ionicons name="checkmark" size={32} color="white" />
        </Animated.View>
        <Text className="mt-4 text-center font-titre-bold text-lg text-colimo-neutre-fonce">
          Livraison confirmée !
        </Text>
        <Text className="mt-1 text-center font-texte text-sm text-colimo-neutre-fonce/60">
          Merci d&apos;avoir utilisé COLIMO.
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TrackScreen() {
  const { session, utilisateur } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState<string | null>(null);
  const [confirmationReussieVisible, setConfirmationReussieVisible] = useState(false);
  const [coursier, setCoursier] = useState<Coursier | null>(null);
  const [coursierUtilisateur, setCoursierUtilisateur] = useState<Utilisateur | null>(null);
  const [positionCoursier, setPositionCoursier] = useState<PositionCoursier | null>(null);
  const [recuEnCours, setRecuEnCours] = useState(false);
  const [confirmationLivraison, setConfirmationLivraison] = useState<ConfirmationLivraison | null>(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);
  const [erreurRenvoi, setErreurRenvoi] = useState<string | null>(null);
  const [signalementEnCours, setSignalementEnCours] = useState(false);
  const [echecEnAttente, setEchecEnAttente] = useState<EchecLivraison | null>(null);
  const [decisionEnCours, setDecisionEnCours] = useState<DecisionEchecLivraison | null>(null);
  const [erreurDecision, setErreurDecision] = useState<string | null>(null);

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
      setConfirmationReussieVisible(true);
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
        try {
          const franchissement = await recupererEtMarquerNotificationPalier(supabase, misAJour.coursierId);
          const evenement = franchissement ? EVENEMENT_PAR_PALIER[franchissement.palierCode] : undefined;
          if (evenement) {
            await notifierEvenement(evenement, {
              declenchePar: session.user.id,
              destinataire: misAJour.coursierId,
              utilisateurId: misAJour.coursierId,
              variables: { taux: `${Math.round(franchissement!.taux * 100)}%` },
            });
          }
        } catch {
          // Notification de franchissement de palier best-effort — ne doit jamais bloquer la confirmation.
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

  // Échec de remise signalé par le coursier — récupère le signalement non
  // encore traité pour afficher son motif et permettre la décision.
  useEffect(() => {
    if (!course || course.statut !== "echouee") {
      setEchecEnAttente(null);
      return;
    }
    let annule = false;
    getEchecsLivraisonPourCourse(course.id).then((echecs) => {
      if (!annule) setEchecEnAttente(echecs.find((e) => e.decision === null) ?? null);
    });
    return () => {
      annule = true;
    };
  }, [course?.id, course?.statut]);

  async function deciderSuiteEchec(decision: DecisionEchecLivraison) {
    if (!echecEnAttente) return;
    setDecisionEnCours(decision);
    setErreurDecision(null);
    try {
      const misAJour = await traiterEchecLivraison(echecEnAttente.id, decision);
      setCourse(misAJour);
      if (session) {
        await notifierEvenement("notification_echec_livraison_resolu", {
          declenchePar: session.user.id,
          destinataire: echecEnAttente.coursierId,
          utilisateurId: echecEnAttente.coursierId,
          variables: { numero_commande: misAJour.numeroCommande, decision: DECISION_ECHEC_LIVRAISON_LABELS[decision] },
        });
      }
    } catch (e) {
      setErreurDecision(e instanceof Error ? e.message : "Impossible d'enregistrer votre choix. Réessayez.");
    } finally {
      setDecisionEnCours(null);
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
            {!contactsFermes && (
              <View className="mt-3 flex-row items-center gap-2">
                {coursierUtilisateur.telephone && (
                  <Bouton
                    label={`Appeler ${coursierUtilisateur.prenom ?? coursierUtilisateur.nom}`}
                    variante="contour"
                    onPress={() => Linking.openURL(`tel:${coursierUtilisateur.telephone}`)}
                    className="flex-1 py-2.5"
                  />
                )}
                <Pressable
                  onPress={() => router.push(`/(client)/chat/${course.id}`)}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  className="h-11 w-11 items-center justify-center rounded-full border border-colimo-neutre-clair bg-white"
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#2B2622" />
                </Pressable>
              </View>
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

        {course.statut === "echouee" && echecEnAttente && (
          <View className="mt-4 rounded-2xl border-2 border-colimo-rouge bg-white p-4">
            <Text className="font-titre text-base text-colimo-neutre-fonce">Livraison échouée</Text>
            <Text className="mt-1 font-texte text-sm text-colimo-neutre-fonce/70">
              Motif : {MOTIF_ECHEC_LIVRAISON_LABELS[echecEnAttente.motif]}
            </Text>
            {echecEnAttente.commentaire && (
              <Text className="mt-1 font-texte text-xs text-colimo-neutre-fonce/50">{echecEnAttente.commentaire}</Text>
            )}
            <Text className="mt-3 font-texte text-sm text-colimo-neutre-fonce">Que souhaitez-vous faire ?</Text>
            <Bouton
              label={DECISION_ECHEC_LIVRAISON_LABELS.nouvelle_tentative}
              onPress={() => deciderSuiteEchec("nouvelle_tentative")}
              chargement={decisionEnCours === "nouvelle_tentative"}
              disabled={decisionEnCours !== null}
              className="mt-3 py-3.5"
            />
            <Bouton
              label={DECISION_ECHEC_LIVRAISON_LABELS.retour}
              variante="contour"
              onPress={() => deciderSuiteEchec("retour")}
              chargement={decisionEnCours === "retour"}
              disabled={decisionEnCours !== null}
              className="mt-2 py-3.5"
            />
            {erreurDecision && <Text className="mt-2 font-texte text-xs text-colimo-rouge">{erreurDecision}</Text>}
          </View>
        )}

        {erreurConfirmation && (
          <Text className="mt-2 text-center font-texte text-xs text-colimo-rouge">{erreurConfirmation}</Text>
        )}
      </ScrollView>

      {(course.statut === "livree" || STATUTS_SIGNALABLES.has(course.statut) || peutAnnulerCourse(course)) && (
        <View className="border-t border-colimo-neutre-clair bg-colimo-fond px-6 pb-2 pt-3">
          {STATUTS_SIGNALABLES.has(course.statut) && (
            <Text
              onPress={signalerProbleme}
              className="mb-2 text-center font-texte-medium text-xs text-colimo-neutre-fonce/50"
            >
              Signaler un problème
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

      <BottomSheet visible={course.statut === "en_attente"}>
        <View className="flex-row items-center gap-3">
          <PointRecherche />
          <View className="flex-1">
            <Text className="font-titre-bold text-base text-colimo-neutre-fonce">Recherche d&apos;un coursier…</Text>
            <Text className="mt-0.5 font-texte text-sm text-colimo-neutre-fonce/60">
              Nous recherchons un coursier disponible à proximité.
            </Text>
          </View>
        </View>
      </BottomSheet>

      {confirmationReussieVisible && (
        <ConfirmationReception onTermine={() => setConfirmationReussieVisible(false)} />
      )}
    </SafeAreaView>
  );
}
