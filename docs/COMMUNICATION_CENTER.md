# Communication Center — COLIMO

Module indépendant qui centralise **toutes** les communications de la
plateforme (Email, SMS, WhatsApp, Push). **Aucun module métier (Courses,
Utilisateurs, Paiements, Litiges, Commerçants, Coursiers...) n'appelle un
fournisseur externe directement** : tout passe par ce module, via l'API
`communication.send()`.

```
Application (mobile / admin)
      │
      ▼
communication.send()  =  envoyerCommunication()
(packages/shared/src/communication/service.ts)
      │
      ├── résout le modèle actif (table modeles_notification, par code + canal)
      ├── interpole les variables {{...}}
      ├── enregistre l'historique (table notifications) — statut "en_attente"
      │
      ▼
Providers  (registre par canal, packages/shared/src/communication/settings)
      │
      ├── Email    → MockEmailProvider (aujourd'hui) / Resend, SendGrid... (demain)
      ├── SMS      → MockSMSProvider (aujourd'hui) / Airtel, Moov, agrégateur... (demain)
      ├── WhatsApp → MockWhatsAppProvider (aujourd'hui) / Meta Business API, Twilio... (demain)
      └── Push     → MockPushProvider (aujourd'hui) / Firebase, OneSignal... (demain)
      │
      ▼
Historique mis à jour — statut "envoyé" ou "échec" (+ message d'erreur)
```

Aucun fournisseur réel n'est connecté à ce stade : tous les canaux utilisent
un fournisseur "mock" qui journalise l'envoi (`console.log`) et répond
systématiquement avec succès. C'est volontaire — l'architecture est prête,
les vrais fournisseurs ne sont pas branchés.

## Architecture (packages/shared/src/communication)

```
communication/
├── providers/    interfaces EmailProvider / SMSProvider / WhatsAppProvider / PushProvider
│                 + implémentations Mock*Provider
├── templates/    ModeleCommunication (DB) + moteur d'interpolation {{variable}}
├── events/       EvenementCommunication → code de modèle + canal (catalogue)
├── history/      CommunicationEnvoyee + getCommunications() (recherche/filtres)
├── statistics/   calculerStatistiques() — fonction pure, aucun appel réseau
├── settings/     registre des fournisseurs actifs par canal (le seul point
│                 de couplage à un fournisseur réel)
├── campaigns/    Campagne — type préparé, non implémenté (prévu V2)
└── service.ts    envoyerCommunication() + communication.send()
```

Les tables Postgres (`notifications`, `modeles_notification`, `codes_otp`,
définies dans `supabase/migrations/0020_module_notifications.sql`) n'ont pas
été renommées — seul le code TypeScript porte la nouvelle identité
"Communication Center" (renommage sans risque, colonnes/tables inchangées).

## Où se trouve le code

- `packages/shared/src/communication/` — cf. arborescence ci-dessus
- `packages/shared/src/otp/` — module OTP indépendant, s'appuie sur
  `envoyerCommunication` (canal SMS, modèle `sms_otp`)
- `apps/mobile/lib/communication.ts` et `apps/admin/lib/communication.ts` —
  wrapper `notifierEvenement()` propre à chaque app : résout le canal via
  `EVENEMENT_CANAL`, n'appelle jamais un fournisseur directement, et avale
  silencieusement toute erreur pour ne jamais bloquer l'action métier
- `apps/admin/app/(dashboard)/communication/page.tsx` — back-office
  ("Communication Center" dans la sidebar, groupe Croissance) : Dashboard,
  Emails, SMS, WhatsApp, Push, Templates, Historique, Statistiques, Paramètres
- `supabase/migrations/0020_module_notifications.sql` — schéma de base
  (tables, types, modèles initiaux)
- `supabase/migrations/0022_communication_center.sql` — modèles ajoutés pour
  compléter le catalogue (authentification par email, statuts commerçant/coursier)

## Envoyer une communication depuis une autre partie du projet

Ne jamais appeler un fournisseur directement. Toujours passer par
`communication.send()` (ou `envoyerCommunication`), ou par le wrapper
`notifierEvenement` côté app pour un événement déjà catalogué :

```ts
import { communication } from "@colimo/shared";

await communication.send(supabase, {
  declenchePar: session.user.id, // qui déclenche l'envoi (RLS)
  utilisateurId: destinataireCompteId, // optionnel, si le destinataire a un compte
  canal: "whatsapp",
  destinataire: "+24107xxxxxx",
  modeleCode: "whatsapp_livraison_terminee",
  variables: { nom_client: "Jean" },
});
```

```ts
// apps/mobile ou apps/admin
import { notifierEvenement } from "@/lib/communication";

await notifierEvenement("livraison_terminee", {
  declenchePar: session.user.id, // absent côté admin, résolu automatiquement
  destinataire: course.telephoneDestinataire,
  variables: { nom_client: course.nomDestinataire ?? "client" },
});
```

## Ajouter un nouveau modèle de message

1. Insérer une ligne dans `modeles_notification` (via une migration, ou
   directement dans l'admin → Communication Center → Templates pour modifier
   le contenu d'un modèle existant).
2. Le `code` doit être unique et stable — c'est lui qu'on référence dans le
   code (`modeleCode: "..."`), jamais l'`id`.
3. Documenter les `variables` attendues (tableau de chaînes) — le moteur
   n'exige pas que toutes soient fournies (une variable manquante reste
   affichée telle quelle, `{{variable}}`, plutôt que de faire échouer l'envoi).
4. Si l'événement correspond à un événement métier, ajouter l'entrée dans
   `EVENEMENT_MODELE_CODE` et `EVENEMENT_CANAL` (`communication/events/index.ts`).

Les textes ne sont jamais codés en dur dans l'application : toute évolution
de contenu passe par l'admin (Communication Center → Templates), pas par un
déploiement.

## Ajouter un nouveau fournisseur

Chaque canal a sa propre interface (email a un sujet, push peut avoir un
titre — SMS et WhatsApp n'ont ni l'un ni l'autre) :

```ts
export interface EmailProvider {
  nom: string;
  envoyer(params: { destinataire: string; sujet: string; contenu: string }): Promise<ResultatEnvoi>;
}
```

Exemple pour brancher Resend (email) :

```ts
import { configurerFournisseurEmail, type EmailProvider } from "@colimo/shared";

const fournisseurResend: EmailProvider = {
  nom: "Resend",
  async envoyer({ destinataire, sujet, contenu }) {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ to: destinataire, subject: sujet, text: contenu, from: "COLIMO <no-reply@colimo.ga>" }),
    });
    if (!reponse.ok) return { succes: false, erreur: await reponse.text() };
    const data = await reponse.json();
    return { succes: true, referenceExterne: data.id };
  },
};

configurerFournisseurEmail(fournisseurResend);
```

Même principe pour `configurerFournisseurSMS` (Airtel/Moov, agrégateur SMS),
`configurerFournisseurWhatsApp` (Meta Business API, Twilio, autre BSP) et
`configurerFournisseurPush` (Firebase, OneSignal).

## Remplacer un fournisseur existant

Un seul appel au setter correspondant (`configurerFournisseurEmail/SMS/WhatsApp/Push`),
effectué une fois au démarrage de l'application. Aucune autre partie du code
n'a besoin d'être modifiée — tous les appels à `communication.send()`
continuent de fonctionner sans changement, puisqu'ils passent toujours par le
registre (`getFournisseurEmail()` etc.), jamais par une référence directe au
fournisseur.

## Module OTP (préparé, non activé)

`packages/shared/src/otp/` fournit `genererOtp` et `verifierOtp`, appuyés sur
la table `codes_otp` et sur `communication.send()` (canal SMS, modèle
`sms_otp`). **Il n'est appelé nulle part dans le flux d'authentification
actuel** (email + mot de passe). Usages prévus une fois activé : vérification
du numéro de téléphone, réinitialisation de mot de passe, double
authentification, validation des commerçants et des coursiers — cf.
`ObjectifOtp`.

## Campagnes (prévu, non implémenté)

`packages/shared/src/communication/campaigns/` définit uniquement le type
`Campagne` (nom, canal, modèle, statut brouillon/planifiée/envoyée) — aucune
logique d'envoi en masse n'existe encore. Préparé pour une V2 (diffusion
groupée aux coursiers ou aux clients d'une zone, par exemple).

## Ce qui est câblé aujourd'hui vs catalogué pour plus tard

| Événement | Déclenché | Où |
|---|---|---|
| Compte créé (bienvenue) | ✅ | `register-client.tsx`, `register-coursier.tsx` |
| Livraison créée | ✅ | `publish.tsx`, `nouvelle-livraison.tsx` |
| Coursier attribué | ✅ | `(coursier)/dashboard.tsx` (`accepter`) |
| Coursier en route | ❌ | pas de statut distinct dans le pipeline actuel |
| Colis récupéré | ✅ | `(coursier)/course/[id].tsx` (statut → `retrait`) |
| Livraison en cours | ✅ | `(coursier)/course/[id].tsx` (statut → `en_cours`) |
| Livraison terminée | ✅ | `(client)/track/[id].tsx` (confirmation) |
| Livraison annulée | ✅ | admin → Courses (`annuler`) |
| Paiement reçu (déclaré) | ✅ | `PaiementAirtelMoney.tsx` (déclaration client) |
| Paiement confirmé | ✅ | admin → Paiements (`valider`) |
| Paiement refusé | ✅ | admin → Paiements (`rejeter`) |
| Compte coursier validé | ✅ | admin → Coursiers (`valider`) |
| Compte coursier — nouvelle course dispo | ❌ | conceptuellement lié aux campagnes (diffusion), pas un déclenchement unitaire |
| Compte commerçant validé/refusé | ❌ | aucun flux de vérification de compte commerçant dans l'app aujourd'hui (contrairement aux coursiers) |
| Email de vérification | ❌ | aucun flux de vérification d'email dans l'authentification actuelle |
| Réinitialisation de mot de passe | ❌ | aucun flux de réinitialisation dans l'authentification actuelle |
| Litige ouvert | ✅ | `SignalerLitigeForm.tsx` |
| Litige résolu | ✅ | admin → Litiges (`resoudre`) |

Tous ces déclenchements utilisent des fournisseurs **mock** — aucun message
n'est réellement envoyé, mais chaque déclenchement crée bien une ligne dans
l'historique (admin → Communication Center → Historique), consultable pour
vérifier que la logique fonctionne avant de brancher un vrai fournisseur.
