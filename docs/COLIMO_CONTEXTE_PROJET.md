# COLIMO — Contexte projet pour Claude Code

Ce document sert de source de vérité pour toutes les sessions de développement.
À placer dans `/docs/COLIMO_CONTEXTE_PROJET.md` à la racine du repo.

## 1. Le produit

Plateforme web et mobile de mise en relation coursiers, entreprises et particuliers,
à Libreville, Akanda, Owendo (Gabon). Slogan : « Directement chez vous ».

Trois profils utilisateurs :
- **Client** (particulier ou entreprise) : publie une demande de course, paie via Mobile Money.
- **Coursier** (indépendant ou salarié d'une structure) : consulte les courses disponibles
  dans sa zone, les accepte, les exécute, reçoit son paiement.
- **Administrateur** : valide les inscriptions coursiers, supervise les courses, gère les
  litiges, consulte les statistiques.

Flux principal :
publication de la course → notification des coursiers disponibles dans la zone →
premier coursier à accepter prend la course → exécution + mise à jour des statuts →
confirmation et paiement par le client → notation mutuelle.

## 2. Stack technique retenu

- **Backend** : Supabase (Postgres + Auth + Storage)
- **App mobile unique** : React Native + Expo — une seule app, interface conditionnée
  par le rôle connecté (Client / Coursier / Entreprise)
- **Back-office admin** : Next.js, déployé sur Vercel
- **Monorepo** : `/apps/mobile`, `/apps/admin`, `/packages/shared` (types, logique
  tarifaire, client API commun)
- **Paiement** : Mobile Money (Airtel Money / Moov Money) via une couche API
  intermédiaire — pas de connecteur natif, un agrégateur ou une intégration directe
  reste à choisir

## 3. Modèle de données

| Table | Champs clés | Relations |
|---|---|---|
| Utilisateurs | id, nom, téléphone, type (client/coursier/admin), zone, statut | 1 Utilisateur → N Courses (client), 1 Utilisateur → N Courses (coursier) |
| Coursiers | id, utilisateur_id, documents, type véhicule, statut vérification, disponibilité, note moyenne | 1 Coursier → 1 Utilisateur |
| Courses | id, client_id, coursier_id, adresses, type colis, prix, statut, horodatages | 1 Course → 1 Client, 1 Course → 1 Coursier, 1 Course → 1 Transaction |
| Transactions | id, course_id, montant, opérateur, référence, statut paiement | 1 Transaction → 1 Course |
| Notations | id, course_id, auteur_id, destinataire_id, note, commentaire | 1 Notation → 1 Course |

## 4. Grille tarifaire (base V1)

| Départ | Arrivée | Tarif |
|---|---|---|
| Libreville | Libreville | 1 500 – 2 500 FCFA |
| Libreville | Owendo | 2 500 – 3 000 FCFA |
| Libreville | Akanda | 2 500 – 3 000 FCFA |
| Akanda | Akanda | 1 500 – 2 000 FCFA |
| Akanda | Libreville | 2 500 – 3 000 FCFA |
| Akanda | Owendo | 3 000 – 3 500 FCFA |
| Owendo | Owendo | 1 500 – 2 000 FCFA |
| Owendo | Libreville | 2 500 – 3 000 FCFA |
| Libreville | Bikélé-Essassa | 3 000 – 4 000 FCFA |
| Libreville | Ntoum | 5 000 FCFA |
| Akanda / Owendo | Bikélé-Essassa | 4 000 – 4 500 FCFA |
| Akanda / Owendo | Ntoum | 6 000 FCFA |

Options : livraison prioritaire (+1 000 FCFA), assurance colis (+300 à 1 000 FCFA
selon valeur). Commission plateforme : 15 % par course.

## 5. Identité visuelle COLIMO

- Rouge principal : `#C41E24`
- Rouge foncé : `#9E1419`
- Rouge clair (fond) : `#FBE7E7`
- Neutre foncé (secondaire) : `#2B2622`
- Neutre clair (fond secondaire) : `#F1EDEA`
- Fond général : `#FAF8F5`
- Police titres : Poppins (600/700) — police texte : Inter
- Logo : boîte en ligne + texte COLIMO, monochrome rouge sur fond blanc (ou blanc sur
  fond rouge en version inversée)

## 6. Ordre de build (MVP V1)

1. Setup repo + schéma Supabase (les 5 tables ci-dessus)
2. Auth OTP + inscription Client / Coursier (avec upload documents coursier)
3. Publier une course + calcul tarifaire + notification coursiers en zone
4. Dashboard coursier (accepter, disponibilité, statuts) + suivi côté client
5. Intégration paiement Mobile Money (webhook + split coursier/plateforme)
6. Notation bidirectionnelle
7. Back-office admin (validation coursiers, litiges, statistiques)

Scope volontairement exclu du V1 (à réintroduire en V2) : abonnements B2B,
mise en avant commerces, publicité — une fois le flux de base validé sur le terrain,
sur une seule commune pilote.

## 7. Décisions déjà prises (ne pas rouvrir sans raison)

- COLIMO est le nom final (renommage depuis COLIX)
- Développement 100 % sur Claude Code, pas de no-code
- Stack : Supabase + React Native/Expo + Next.js, en monorepo
