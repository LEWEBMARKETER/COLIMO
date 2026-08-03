# Module Notifications — COLIMO

Module indépendant du reste de l'application, chargé d'envoyer SMS, WhatsApp,
Email et (plus tard) Push. **Aucune autre partie du code n'appelle un
fournisseur externe directement** : tout passe par ce module.

```
Application (mobile / admin)
      │
      ▼
envoyerNotification()  (packages/shared/src/notifications/service.ts)
      │
      ├── résout le modèle (table modeles_notification)
      ├── interpole les variables {{...}}
      ├── enregistre l'historique (table notifications)
      │
      ▼
getFournisseur(type)  (registre par canal)
      │
      ├── SMS      → fournisseur mock (aujourd'hui) / fournisseur réel (demain)
      ├── WhatsApp → fournisseur mock (aujourd'hui) / Meta ou BSP (demain)
      ├── Email    → fournisseur mock (aujourd'hui) / fournisseur réel (demain)
      └── Push     → fournisseur mock (aujourd'hui) / fournisseur réel (demain)
```

Aucun fournisseur réel n'est connecté à ce stade : tous les canaux utilisent
un fournisseur "mock" qui journalise l'envoi (`console.log`) et répond
systématiquement avec succès. C'est volontaire — l'architecture est prête,
les vrais fournisseurs ne sont pas branchés.

## Où se trouve le code

- `packages/shared/src/notifications/types.ts` — types (`TypeNotification`,
  `StatutNotification`, `ModeleNotification`, `NotificationEnvoyee`)
- `packages/shared/src/notifications/providers.ts` — interface
  `FournisseurNotification`, fournisseurs mock, registre, `configurerFournisseur`
- `packages/shared/src/notifications/moteur.ts` — interpolation des `{{variables}}`
- `packages/shared/src/notifications/evenements.ts` — catalogue des
  événements métier → code de modèle par défaut
- `packages/shared/src/notifications/service.ts` — `envoyerNotification`,
  `getNotifications`, `getModelesNotification`, `patchModeleNotification`
- `packages/shared/src/otp/` — module OTP indépendant (voir plus bas)
- `apps/mobile/lib/notifications.ts` et `apps/admin/lib/notifications.ts` —
  wrapper `notifierEvenement()` propre à chaque app, qui ne bloque jamais
  l'action métier si la notification échoue
- `apps/admin/app/(dashboard)/notifications/` — back-office (historique,
  modèles, stats)
- `supabase/migrations/0020_module_notifications.sql` — schéma (tables
  `notifications`, `modeles_notification`, `codes_otp`) et modèles par défaut

## Envoyer une notification depuis une autre partie du projet

Ne jamais appeler un fournisseur directement. Toujours passer par
`envoyerNotification` (ou, côté app, par le wrapper `notifierEvenement` qui
gère les événements du catalogue) :

```ts
import { envoyerNotification } from "@colimo/shared";

await envoyerNotification(supabase, {
  declenchePar: session.user.id, // qui déclenche l'envoi (RLS)
  utilisateurId: destinataireCompteId, // optionnel, si le destinataire a un compte
  type: "whatsapp",
  destinataire: "+24107xxxxxx",
  modeleCode: "whatsapp_livraison_terminee",
  variables: { nom_client: "Jean" },
});
```

Pour un événement déjà catalogué (cf. `evenements.ts`), utiliser plutôt le
wrapper de l'app concernée :

```ts
// apps/mobile
import { notifierEvenement } from "@/lib/notifications";

await notifierEvenement("livraison_terminee", {
  declenchePar: session.user.id,
  destinataire: course.telephoneDestinataire,
  variables: { nom_client: course.nomDestinataire ?? "client" },
});
```

Ce wrapper avale silencieusement toute erreur : un problème de notification
ne doit jamais faire échouer l'opération métier (course créée, litige
ouvert...) qui l'a déclenchée.

## Ajouter un nouveau modèle de message

1. Insérer une ligne dans `modeles_notification` (via une migration, ou
   directement dans l'admin → Notifications → Modèles pour le contenu d'un
   modèle existant).
2. Le `code` doit être unique et stable — c'est lui qu'on référence dans le
   code (`modeleCode: "..."`), jamais l'`id`.
3. Documenter les `variables` attendues (tableau de chaînes), utilisées pour
   l'affichage dans l'admin — le moteur n'exige pas que toutes soient
   fournies (une variable manquante reste affichée telle quelle,
   `{{variable}}`, plutôt que de faire échouer l'envoi).
4. Si l'événement correspond à un événement métier du catalogue, ajouter
   l'entrée dans `EVENEMENT_MODELE_CODE` (`evenements.ts`).

Les textes ne sont jamais codés en dur dans l'application : toute évolution
de contenu passe par l'admin (Notifications → Modèles), pas par un déploiement.

## Ajouter un nouveau fournisseur

Un fournisseur doit juste respecter l'interface `FournisseurNotification` :

```ts
export interface FournisseurNotification {
  nom: string;
  envoyer(params: { destinataire: string; sujet?: string; contenu: string }): Promise<ResultatEnvoiNotification>;
}
```

Exemple pour brancher Meta WhatsApp Business Platform :

```ts
import { configurerFournisseur, type FournisseurNotification } from "@colimo/shared";

const fournisseurMetaWhatsApp: FournisseurNotification = {
  nom: "Meta WhatsApp Business",
  async envoyer({ destinataire, contenu }) {
    const reponse = await fetch("https://graph.facebook.com/v20.0/.../messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.META_WHATSAPP_TOKEN}` },
      body: JSON.stringify({ to: destinataire, text: { body: contenu } }),
    });
    if (!reponse.ok) return { succes: false, erreur: await reponse.text() };
    const data = await reponse.json();
    return { succes: true, referenceExterne: data.messages?.[0]?.id };
  },
};

configurerFournisseur("whatsapp", fournisseurMetaWhatsApp);
```

## Remplacer un fournisseur existant

Un seul appel à `configurerFournisseur(type, nouveauFournisseur)`, effectué
une fois au démarrage de l'application (par exemple dans
`apps/mobile/app/_layout.tsx` ou `apps/admin/lib/notifications.ts`). Aucune
autre partie du code n'a besoin d'être modifiée — tous les appels à
`envoyerNotification` continuent de fonctionner sans changement, puisqu'ils
passent toujours par le registre (`getFournisseur`), jamais par une
référence directe au fournisseur.

Pour avoir plusieurs fournisseurs disponibles pour un même canal (ex. SMS :
Provider A pour le Gabon, Provider B en secours), la façon la plus simple est
d'écrire un fournisseur "composite" qui essaie A puis B en cas d'échec, et de
l'enregistrer comme seul fournisseur SMS via `configurerFournisseur("sms", composite)`.

## Module OTP (préparé, non activé)

`packages/shared/src/otp/` fournit `genererOtp` et `verifierOtp`, appuyés sur
la table `codes_otp` et sur le module Notifications (canal SMS, modèle
`sms_otp`). **Il n'est appelé nulle part dans le flux d'authentification
actuel** (email + mot de passe). Usages prévus une fois activé : vérification
du numéro de téléphone, réinitialisation de mot de passe, double
authentification, validation des commerçants et des coursiers — cf.
`ObjectifOtp`.

## Ce qui est câblé aujourd'hui vs prévu pour plus tard

| Événement | Déclenché | Où |
|---|---|---|
| Livraison créée | ✅ | `publish.tsx`, `nouvelle-livraison.tsx` |
| Coursier attribué | ✅ | `(coursier)/dashboard.tsx` (`accepter`) |
| Coursier en route | ❌ | pas de statut distinct dans le pipeline actuel |
| Colis récupéré | ✅ | `(coursier)/course/[id].tsx` (statut → `retrait`) |
| Livraison en cours | ✅ | `(coursier)/course/[id].tsx` (statut → `en_cours`) |
| Livraison terminée | ✅ | `(client)/track/[id].tsx` (confirmation) |
| Livraison annulée | ✅ | admin → Courses (`annuler`) |
| Litige ouvert | ✅ | `SignalerLitigeForm.tsx` |
| Litige résolu | ✅ | admin → Litiges (`resoudre`) |

Tous ces déclenchements utilisent le fournisseur WhatsApp **mock** — aucun
message n'est réellement envoyé à un utilisateur, mais chaque déclenchement
crée bien une ligne dans l'historique (admin → Notifications → Historique),
consultable pour vérifier que la logique fonctionne avant de brancher un
vrai fournisseur.
