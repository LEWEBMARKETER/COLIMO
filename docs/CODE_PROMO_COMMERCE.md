# Code promo à la publication d'une course — commerces

## Audit préalable

Le système de codes promo existait déjà entièrement (migration 0011) :
table `codes_promo` (admin-only en écriture, lecture ouverte à tout
authentifié), colonnes `courses.code_promo_id`/`reduction_promo`,
validation (`codePromoValide`) et calcul de réduction
(`calculerReductionPromo`) dans `packages/shared/src/pricing`, page admin
`/promotions` pour créer/activer les codes, et le tout déjà branché côté
client particulier (`apps/mobile/app/(client)/publish.tsx`). **Seul le
formulaire de création de course pour les commerces
(`apps/mobile/app/(client)/nouvelle-livraison.tsx`) n'avait aucun champ
code promo** — c'est la seule vraie lacune, comblée ici en réutilisant
exactement le même mécanisme (aucune nouvelle table, aucune nouvelle
colonne, aucune logique dupliquée).

## Ce qui a été ajouté

Dans `nouvelle-livraison.tsx` (formulaire "Nouvelle livraison" du
commerce) : un champ "Code promo (optionnel)" + bouton "Appliquer" (même
composant/comportement que côté client particulier), la réduction calculée
s'affiche dans `PriceSummary`, et `code_promo_id`/`reduction_promo` sont
transmis à `creerCourse` comme pour n'importe quelle autre course — un
code promo créé par un admin dans `/promotions` fonctionne donc
immédiatement pour un commerce, sans configuration supplémentaire.

## Ce qui n'a pas été touché

- Table `codes_promo`, RLS, page admin `/promotions` : inchangées.
- `publish.tsx` (client particulier) : inchangé.
- Aucune restriction par type de compte n'existe dans `codes_promo`
  aujourd'hui (un code s'applique à tout authentifié) — un commerce peut
  donc utiliser n'importe quel code actif, exactement comme un client
  particulier. Une segmentation "codes réservés aux commerces" n'a pas
  été demandée et n'a pas été ajoutée.

## Fichier modifié

`apps/mobile/app/(client)/nouvelle-livraison.tsx`

## Tests manuels

- [ ] Créer un code promo actif dans `/promotions` (admin).
- [ ] Depuis un compte commerce, "Nouvelle livraison" : saisir le code, "Appliquer" → réduction affichée dans le récapitulatif.
- [ ] Publier la livraison : vérifier `courses.code_promo_id`/`reduction_promo` renseignés, prix final réduit.
- [ ] Code invalide/expiré : message d'erreur, aucune réduction appliquée.
- [ ] Vérifier `usage_actuel` du code (page `/promotions`) après utilisation par un commerce.
