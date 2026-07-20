// Données de démonstration pour la conception des écrans admin.
// TODO: remplacer par des requêtes Supabase (@supabase/supabase-js) une fois le projet connecté.

import type { Coursier, Course, Utilisateur, Zone } from "@colimo/shared";

export interface CoursierAvecUtilisateur extends Coursier {
  utilisateur: Utilisateur;
}

const utilisateurJeanObame: Utilisateur = { id: "u1", nom: "Jean Obame", telephone: "+24177000001", type: "coursier", zone: "libreville", statut: "actif", createdAt: "2026-06-01" };
const utilisateurMarieNdong: Utilisateur = { id: "u2", nom: "Marie Ndong", telephone: "+24177000002", type: "coursier", zone: "akanda", statut: "actif", createdAt: "2026-06-03" };
const utilisateurPaulMba: Utilisateur = { id: "u3", nom: "Paul Mba", telephone: "+24177000003", type: "coursier", zone: "owendo", statut: "actif", createdAt: "2026-06-10" };
const utilisateurSylvieOndo: Utilisateur = { id: "u4", nom: "Sylvie Ondo", telephone: "+24177000010", type: "client", zone: "libreville", statut: "actif", createdAt: "2026-06-15" };
const utilisateurBoutiqueEkomi: Utilisateur = { id: "u5", nom: "Boutique Ekomi", telephone: "+24177000011", type: "client", zone: "akanda", statut: "actif", createdAt: "2026-06-18" };

export const utilisateurs: Utilisateur[] = [
  utilisateurJeanObame,
  utilisateurMarieNdong,
  utilisateurPaulMba,
  utilisateurSylvieOndo,
  utilisateurBoutiqueEkomi,
];

export const coursiers: CoursierAvecUtilisateur[] = [
  {
    id: "c1",
    utilisateurId: "u1",
    documents: ["cni.jpg", "permis.jpg"],
    typeVehicule: "moto",
    statutVerification: "valide",
    disponibilite: true,
    noteMoyenne: 4.7,
    utilisateur: utilisateurJeanObame,
  },
  {
    id: "c2",
    utilisateurId: "u2",
    documents: ["cni.jpg"],
    typeVehicule: "velo",
    statutVerification: "en_attente",
    disponibilite: false,
    noteMoyenne: 0,
    utilisateur: utilisateurMarieNdong,
  },
  {
    id: "c3",
    utilisateurId: "u3",
    documents: ["cni.jpg", "carte_grise.jpg"],
    typeVehicule: "voiture",
    statutVerification: "rejete",
    disponibilite: false,
    noteMoyenne: 3.2,
    utilisateur: utilisateurPaulMba,
  },
];

export const courses: Course[] = [
  {
    id: "co1",
    clientId: "u4",
    coursierId: "u1",
    adresseDepart: "Quartier Louis, Libreville",
    adresseArrivee: "Nombakélé, Libreville",
    zoneDepart: "libreville",
    zoneArrivee: "libreville",
    typeColis: "Documents",
    livraisonPrioritaire: false,
    prix: 2000,
    statut: "en_cours",
    createdAt: "2026-07-20T08:12:00Z",
  },
  {
    id: "co2",
    clientId: "u5",
    coursierId: null,
    adresseDepart: "Akanda centre",
    adresseArrivee: "Owendo marché",
    zoneDepart: "akanda",
    zoneArrivee: "owendo",
    typeColis: "Colis moyen",
    livraisonPrioritaire: true,
    prix: 3500,
    statut: "en_attente",
    createdAt: "2026-07-20T09:03:00Z",
  },
  {
    id: "co3",
    clientId: "u4",
    coursierId: "u3",
    adresseDepart: "Libreville centre-ville",
    adresseArrivee: "Ntoum",
    zoneDepart: "libreville",
    zoneArrivee: "ntoum",
    typeColis: "Colis fragile",
    livraisonPrioritaire: false,
    valeurDeclaree: 25000,
    prix: 5600,
    statut: "litige",
    createdAt: "2026-07-19T14:40:00Z",
  },
  {
    id: "co4",
    clientId: "u5",
    coursierId: "u1",
    adresseDepart: "Owendo port",
    adresseArrivee: "Libreville, Batterie IV",
    zoneDepart: "owendo",
    zoneArrivee: "libreville",
    typeColis: "Colis volumineux",
    livraisonPrioritaire: false,
    prix: 2800,
    statut: "confirmee",
    createdAt: "2026-07-18T11:20:00Z",
  },
];

export const zones: Zone[] = ["libreville", "akanda", "owendo", "bikele_essassa", "ntoum"];
