# Livraison programmée : sélection par calendrier (jour + heure)

## Audit préalable

L'option "Programmée" existait déjà des deux côtés (client particulier
`publish.tsx`, commerce `nouvelle-livraison.tsx`) et écrivait déjà
`courses.programmee_pour` en ISO — mais la saisie se faisait via un champ
texte libre (`new Date(texte)`), sans aucun contrôle de format ni retour
visuel avant l'envoi ("Format de date invalide" découvert seulement à la
publication). Aucune donnée ni colonne n'a changé : seul le mode de
saisie est remplacé.

## Ce qui a été ajouté

- **`SelecteurCreneauProgramme`** (`apps/mobile/components/`), partagé par
  les deux écrans : deux rangées de pastilles défilantes réutilisant
  `GroupePastilles` (déjà utilisé partout ailleurs dans ces mêmes
  formulaires — Type de livraison, Statut du paiement...) plutôt qu'une
  nouvelle bibliothèque de calendrier :
  - **Jour** : 14 prochains jours ("Aujourd'hui", "Demain", puis "Lun 12", "Mar 13"...).
  - **Heure** : créneaux de 30 min, 8h-20h ; sur "Aujourd'hui", les
    créneaux déjà passés (avec 30 min de marge) sont retirés
    automatiquement.
- **`construireDateProgrammee(jour, heure)`** (`packages/shared/src/programmation`) :
  compose les deux en date ISO, remplaçant le `new Date(texte)` fragile —
  aucune saisie invalide n'est plus possible, le calendrier ne propose
  que des créneaux valides.
- Le bouton de publication reste désactivé tant qu'un jour **et** une
  heure ne sont pas choisis (pour "Programmée"), côté client comme côté
  commerce — c'était déjà le cas côté client, ajouté côté commerce qui ne
  bloquait pas le bouton auparavant (aperçu de l'erreur seulement à la
  publication).

## Ce qui n'a pas été touché

`courses.programmee_pour` (colonne, format ISO), l'affichage de cette
date côté coursier/admin, le reste du formulaire (adresses, colis,
paiement, code promo) : inchangés.

## Fichiers

**Nouveaux** : `packages/shared/src/programmation/index.ts`, `apps/mobile/components/SelecteurCreneauProgramme.tsx`

**Modifiés** : `packages/shared/src/index.ts`, `apps/mobile/app/(client)/publish.tsx`, `apps/mobile/app/(client)/nouvelle-livraison.tsx`

## Tests manuels

- [ ] Client particulier : étape "Options" → "Programmée" → le calendrier jour/heure apparaît, bouton "Suivant" désactivé tant que rien n'est choisi.
- [ ] Commerce : "Nouvelle livraison" → "Programmée" → même comportement, bouton "Demander un coursier" désactivé tant que rien n'est choisi.
- [ ] Sélectionner "Aujourd'hui" tard dans la journée (après 19h30) : message "Plus aucun créneau disponible aujourd'hui".
- [ ] Choisir un jour puis un autre : si l'heure précédemment choisie n'est plus valable (repassage sur "Aujourd'hui" après l'heure choisie), elle se désélectionne automatiquement.
- [ ] Publier une livraison programmée : vérifier `courses.programmee_pour` en base (ISO, correspond au jour/heure choisis dans le fuseau horaire de l'appareil).
- [ ] `pnpm --filter @colimo/{shared,mobile} typecheck` et `expo export -p web` (les deux passent).

⚠️ Non vérifiable dans cet environnement (aucun accès réseau/Supabase live) : rendu réel dans un navigateur avec un compte connecté.
