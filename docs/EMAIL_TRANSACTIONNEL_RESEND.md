# Emails transactionnels réels (Resend)

## Contexte

Le Communication Center (`packages/shared/src/communication`) gère déjà
toutes les notifications automatiques de la plateforme (bienvenue à
l'inscription, course créée, coursier validé, litige ouvert, paiement
confirmé...), mais le canal email tournait encore à 100% sur
`MockEmailProvider` — aucun email n'était réellement envoyé aux
utilisateurs, seulement journalisé en base pour test (cf.
`docs/COMMUNICATION_CENTER.md`).

Ceci est **distinct** du formulaire de contact de l'onglet Support
(`docs/SUPPORT.md`), qui utilise le SMTP direct de la boîte
`contact@colimo.online` — adapté à un usage ponctuel à destinataire
unique, mais pas au volume et à la variété de destinataires des
notifications automatiques. D'où le choix d'un service email
transactionnel dédié (Resend) pour ce canal, distinct du SMTP.

## Ce qui a été fait

Branché **Resend** comme fournisseur réel du canal email, sur les deux
apps (`colimo-mobile` et `colimo-admin`), qui déclenchent toutes les deux
des notifications (respectivement côté utilisateurs et côté actions
admin) :

- `apps/mobile/api/email/envoyer.ts` / `apps/admin/app/api/email/route.ts` :
  routes serveur dédiées (une par app, déploiements Vercel distincts)
  qui appellent l'API Resend avec la clé secrète — jamais exposée au
  frontend. Authentification requise (session Supabase valide côté
  mobile, compte admin vérifié côté back-office) pour empêcher un usage
  de ces routes comme relais d'envoi ouvert.
- `apps/mobile/lib/emailProvider.ts` / `apps/admin/lib/emailProvider.ts` :
  fournisseurs `EmailProvider` qui appellent ces routes, branchés sur le
  Communication Center via `configurerFournisseurEmail` — même schéma que
  `WebPushProvider` (notifications push, déjà réel) : le reste de
  l'application n'a rien à changer, chaque notification email continue
  d'être journalisée dans `notifications` exactement comme avant, avec en
  plus un vrai envoi.

## Domaine et compte

Compte Resend créé avec `contact@colimo.online`, domaine `colimo.online`
vérifié (DKIM + SPF). Expéditeur par défaut des notifications :
`COLIMO <notifications@colimo.online>` — volontairement distinct de
`contact@colimo.online` (boîte surveillée par des humains pour le
formulaire Support) pour ne pas mélanger les deux flux.

## Variables d'environnement à configurer manuellement (Vercel)

À définir **sur les deux projets** (`colimo-mobile` ET `colimo-admin`),
type **Secret** pour la clé :

| Variable | Rôle |
|---|---|
| `RESEND_API_KEY` | Clé API Resend, permission "Sending access", restreinte au domaine `colimo.online`. **Secret**. |
| `RESEND_EMAIL_EXPEDITEUR` | Optionnel, défaut `COLIMO <notifications@colimo.online>`. |

Sans `RESEND_API_KEY`, les routes répondent une erreur claire ("Envoi
d'email non configuré côté serveur") plutôt que d'échouer silencieusement
— même principe que pour le formulaire Support.

## Ce qui n'a pas été touché

SMS et WhatsApp restent en `Mock*Provider` (hors sujet ici, non demandé).
Le formulaire de contact Support (SMTP direct) est inchangé. Le reste du
Communication Center (templates, historique, statistiques, réglages) :
inchangé — c'est précisément l'intérêt de l'architecture "fournisseur
interchangeable" déjà en place.

## Fichiers modifiés/ajoutés

**Nouveaux** :
- `apps/mobile/api/email/envoyer.ts`, `apps/mobile/lib/emailProvider.ts`
- `apps/admin/app/api/email/route.ts`, `apps/admin/lib/emailProvider.ts`

**Modifiés** :
- `apps/mobile/app/_layout.tsx` (initialisation au démarrage, web uniquement)
- `apps/admin/lib/communication.ts` (initialisation au premier import)

## Tests manuels

- [ ] Configurer `RESEND_API_KEY` sur les deux projets Vercel, redéployer.
- [ ] Créer un compte coursier depuis l'app mobile : vérifier la réception réelle de l'email de bienvenue.
- [ ] Valider un coursier depuis le back-office admin : vérifier la réception réelle de l'email de validation.
- [ ] Retirer temporairement `RESEND_API_KEY` : vérifier que l'échec est journalisé en base (statut "echec") sans bloquer l'action métier (comportement déjà garanti par `envoyerCommunication`, cf. commentaire dans `service.ts`).
- [ ] `pnpm --filter @colimo/{shared,mobile,admin} typecheck`, `next build` et `expo export -p web` (tous passent).
