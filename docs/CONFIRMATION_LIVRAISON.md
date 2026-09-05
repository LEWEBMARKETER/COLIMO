# Confirmation de livraison sécurisée (OTP + double confirmation + preuve photo)

Audit préalable (cf. session) : le modèle de statuts existant
(`acceptee → retrait → en_cours → livree → confirmee`) correspondait déjà
presque exactement au parcours demandé — "livree" étant déjà "coursier a
livré, en attente de confirmation client" et "confirmee" déjà "client a
confirmé". Cette fonctionnalité **réutilise ces statuts tels quels** et
n'ajoute que ce qui manquait : le code de réception (OTP), la preuve photo,
et le verrouillage serveur de ces deux transitions (jusqu'ici déclarables
directement par un `patchCourse` client/coursier, sans aucune vérification).

## 1. Ce qui existait déjà et n'a pas été recréé

- Statuts de course, RLS de `courses` (client_id/coursier_id/admin), Communication Center (WhatsApp/in-app), bucket privé `documents` (repris comme modèle pour `delivery-proofs`), `uploadFichier` (étendu, pas dupliqué), système de litiges (le bouton "Signaler un problème" continue d'ouvrir l'écran de litige existant, inchangé), suivi public par code court (`code_suivi`, étendu pour aussi porter l'OTP au destinataire).
- Aucune donnée existante supprimée ou modifiée destructivement. Les anciennes courses (sans ligne `confirmations_livraison`, migration appliquée après leur création) continuent de fonctionner : les fonctions de vérification/confirmation tolèrent son absence via `not found` explicite.

## 2. Nouveau modèle de données (`supabase/migrations/0042_confirmation_livraison.sql`)

- `configuration_confirmation_livraison` (bascule unique, admin) : longueur OTP (4 ou 6), validité, tentatives max, renvois max, **délai de finalisation automatique** (section 6 du besoin, configurable sans redéploiement).
- `confirmations_livraison` (une ligne par course, **auto-créée par trigger** à la création de la course — aucune modification du code de création de course nécessaire) : `code_otp`, `otp_genere_at/expire_at/verifie_at/tentatives/renvois`, `coursier_confirme_at`, `client_confirmation_statut` (`en_attente|confirme|signale|auto_finalise`), `client_confirme_at`, `preuve_photo_path/url/uploaded_at`, `finalise_at`.
- `historique_confirmation_livraison` : journal append-only (otp_genere, otp_renvoye, otp_echec, otp_verifie, photo_ajoutee, coursier_confirme, client_confirme, client_signale, livraison_finalisee, auto_finalisee) — visible aux deux parties + admin, base du "journal de preuve" en cas de litige.

### Pourquoi le coursier ne peut jamais lire le code

`confirmations_livraison` n'a **aucune policy RLS de lecture pour le
coursier** (uniquement client propriétaire + admin) — pas une histoire de
masquage côté écran, une vraie impossibilité au niveau base de données. Le
coursier n'interagit qu'au travers de fonctions `security definer` qui ne
renvoient jamais la colonne `code_otp` :

- `verifier_otp_livraison(course_id, code)` — vérifie, incrémente les
  tentatives, ne renvoie que `{valide, erreur?, tentativesRestantes?}`.
- `get_etat_confirmation_coursier(course_id)` — état réduit (tentatives
  restantes, confirmation déjà faite, statut client, photo déjà envoyée).
- `enregistrer_preuve_livraison(course_id, chemin, url)` — n'accepte la
  photo qu'après vérification OTP déjà enregistrée.

### Verrouillage des transitions "livree"/"confirmee"

Un nouveau trigger (`proteger_transition_livree_courses`) empêche
désormais un `patchCourse` direct de poser ces deux statuts — seules les
fonctions ci-dessus (et `confirmer_reception_client`, `finaliser_livraisons_en_attente`)
le peuvent, via l'indicateur transaction-interne déjà utilisé ailleurs dans
le projet (`colimo.systeme_interne`, cf. 0028). C'était une lacune de
sécurité préexistante (le frontend pouvait déclarer une course "livrée" ou
"confirmée" sans aucune vérification) — corrigée par cette fonctionnalité.

## 3. Stockage de la preuve photo

Nouveau bucket **privé** `delivery-proofs` (`file_size_limit` 10 Mo,
JPEG/PNG/WebP uniquement — mêmes limites que le bucket `documents`
existant). Chemin `"<course_id>/<fichier>"` (dossier = course, pas
utilisateur, car client **et** coursier doivent pouvoir lire la même
preuve) : RLS storage dédiée, lecture réservée aux deux parties de la
course + admin, écriture réservée au coursier assigné. `uploadFichier`
(déjà utilisé pour avatars/documents) accepte désormais `"delivery-proofs"`
sans aucune duplication de code.

## 4. Parcours implémenté

- **Coursier** (`(coursier)/course/[id].tsx`) : le bouton générique
  "Marquer « ... »" ne propose plus la transition vers "livree" — à la
  place, dès `statut = "en_cours"`, un panneau "📦 Confirmation de
  livraison" demande le code (tentatives limitées, messages d'erreur
  différenciés incorrect/expiré/trop de tentatives). Une fois validé,
  panneau "📸 Preuve de livraison" (caméra ou galerie,
  `PreuveLivraisonPicker.tsx`) puis upload + `enregistrer_preuve_livraison`.
- **Client** (`(client)/track/[id].tsx`) : carte "Votre code de réception"
  (masquée dès que le code a été vérifié ou la livraison terminée/annulée),
  bouton de renvoi anti-abus (quota + cooldown appliqués côté serveur).
  "Confirmer la réception"/"Signaler un problème" appellent désormais
  `confirmer_reception_client` au lieu d'un `patchCourse` direct.
- **Destinataire sans compte** (`/suivi/[code]`) : le code est aussi
  affiché sur cette page (souvent la seule personne physiquement présente
  à la remise) et inclus dans le message WhatsApp envoyé à la création de
  la course (`{{code_otp}}` ajouté à `whatsapp_livraison_creee`, garde
  conditionnelle comme pour `{{lien_suivi}}` en 0037 — n'écrase jamais une
  personnalisation déjà faite depuis Communication Center).
- **Finalisation automatique** (besoin section 6) : `finaliser_livraisons_en_attente()`,
  appelée par une tâche planifiée Vercel Cron (`apps/mobile/api/livraison/finaliser-en-attente.ts`,
  toutes les heures) — une livraison confirmée par le coursier mais jamais
  par le client au-delà du délai configuré est finalisée d'office. Le
  coursier n'est donc jamais bloqué par l'inaction du client.
- **Admin** (`/courses`) : nouvelle colonne "Preuve de livraison" (statut
  OTP, statut de confirmation client, lien vers la photo si disponible).

## 5. Variables d'environnement / configuration Vercel à faire manuellement

| Variable | Projet | Rôle |
|---|---|---|
| `CRON_SECRET` | colimo-mobile | Optionnel mais recommandé : Vercel signe automatiquement ses appels cron avec ce secret (`Authorization: Bearer ...`) dès qu'il est défini — l'endpoint le vérifie. |

Aucune autre variable nouvelle : `SUPABASE_SERVICE_ROLE_KEY` et
`EXPO_PUBLIC_SUPABASE_URL` sont déjà configurées (fonctionnalités
précédentes). Le cron lui-même (`vercel.json`) est déployé automatiquement
avec le code, aucune configuration manuelle sur le dashboard Vercel.

⚠️ **Plan Vercel Hobby** : les cron jobs y sont limités (souvent une seule
exécution par jour). L'horaire actuel (`0 * * * *`, toutes les heures) peut
nécessiter un plan Pro. Sur Hobby, Vercel ajuste ou rejette silencieusement
l'horaire — vérifiez l'onglet **Cron Jobs** du projet après déploiement, et
ajustez `configuration_confirmation_livraison.delai_auto_finalisation_minutes`
en conséquence si la fréquence réelle est plus faible qu'attendu.

## 6. Migration à appliquer

`supabase/migrations/0042_confirmation_livraison.sql` (SQL Editor Supabase, après 0038-0041 déjà fournies).

## 7. Fichiers modifiés/ajoutés

**Nouveaux** :
- `supabase/migrations/0042_confirmation_livraison.sql`
- `packages/shared/src/confirmationLivraison/` (types.ts, index.ts)
- `apps/mobile/components/PreuveLivraisonPicker.tsx`
- `apps/mobile/api/livraison/finaliser-en-attente.ts`

**Modifiés** :
- `packages/shared/src/index.ts`, `src/suivi/types.ts`, `src/suivi/index.ts`, `src/supabase/queries.ts` (uploadFichier)
- `apps/mobile/lib/api.ts`, `apps/mobile/vercel.json`
- `apps/mobile/app/(coursier)/course/[id].tsx` (panneaux OTP + photo)
- `apps/mobile/app/(client)/track/[id].tsx` (code, renvoi, confirmation)
- `apps/mobile/app/(client)/publish.tsx`, `apps/mobile/app/(client)/nouvelle-livraison.tsx` (variable `code_otp`)
- `apps/mobile/app/suivi/[token].tsx` (affichage code destinataire)
- `apps/admin/lib/api.ts`, `apps/admin/app/(dashboard)/courses/page.tsx` (colonne preuve)

## 8. Tests (manuels — aucun framework de tests automatisés n'existe dans ce projet à ce jour)

- [ ] Créer une course, vérifier qu'une ligne `confirmations_livraison` existe avec un code à 4 chiffres.
- [ ] Vérifier que le message WhatsApp reçu par le destinataire contient bien le code (mode dégradé : fournisseur toujours "mock" tant que le Communication Center n'a pas de vrais identifiants — cf. `docs/COMMUNICATION_CENTER.md`).
- [ ] Côté client (`track/[id].tsx`) : voir le code s'afficher dès la création, tester "Générer/envoyer à nouveau le code" (doit fonctionner 3 fois puis être refusé ; refus si redemandé avant 60s).
- [ ] Côté coursier : faire progresser la course jusqu'à "en_cours", vérifier que le bouton générique a disparu et que le panneau code apparaît ; tester un code incorrect (message + décompte des tentatives), un code correct (passage automatique au panneau photo, statut de la course passe à "livree").
- [ ] Épuiser les tentatives (5 par défaut) : vérifier le blocage.
- [ ] Envoyer la photo : vérifier son apparition dans la colonne "Preuve de livraison" côté admin (lien cliquable).
- [ ] Confirmer côté client : vérifier le passage à "confirmee" et l'apparition de `NotationForm`.
- [ ] Signaler un problème à la place de confirmer : vérifier `client_confirmation_statut = 'signale'` et l'ouverture de l'écran de litige existant.
- [ ] Ne pas confirmer côté client, déclencher manuellement `POST /api/livraison/finaliser-en-attente` (avec l'en-tête `Authorization: Bearer <CRON_SECRET>` si défini) après avoir temporairement réduit `delai_auto_finalisation_minutes` à 0 en base — vérifier le passage automatique à "confirmee".
- [ ] Vérifier qu'une ancienne course (créée avant cette migration, donc sans ligne `confirmations_livraison`) ne casse aucun écran existant.
- [ ] Vérifier que les comptes/rôles/permissions Client/Coursier/Commerce restent bien séparés (un coursier ne doit voir le code nulle part, y compris via les DevTools réseau — la RLS l'empêche à la source).

## 9. Compatibilité COLIMO PRO

Aucune règle d'abonnement modifiée. La structure (`configuration_confirmation_livraison`)
permet d'ajouter facilement, plus tard, une réservation de certaines
options (ex. photo obligatoire, délai de finalisation plus long) aux plans
Starter/Business si COLIMO le décide — non fait ici, non demandé.
