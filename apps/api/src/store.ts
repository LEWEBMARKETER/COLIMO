import type {
  Coursier,
  Course,
  Notation,
  Utilisateur,
  VerificationStatus,
  Zone,
} from "@colimo/shared";

let idCounter = 100;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}${idCounter}`;
}

export const utilisateurs: Utilisateur[] = [
  { id: "u1", nom: "Jean Obame", telephone: "+24177000001", type: "coursier", zone: "libreville", statut: "actif", createdAt: "2026-06-01" },
  { id: "u2", nom: "Marie Ndong", telephone: "+24177000002", type: "coursier", zone: "akanda", statut: "actif", createdAt: "2026-06-03" },
  { id: "u3", nom: "Paul Mba", telephone: "+24177000003", type: "coursier", zone: "owendo", statut: "actif", createdAt: "2026-06-10" },
  { id: "u4", nom: "Sylvie Ondo", telephone: "+24177000010", type: "client", zone: "libreville", statut: "actif", createdAt: "2026-06-15" },
  { id: "u5", nom: "Boutique Ekomi", telephone: "+24177000011", type: "client", zone: "akanda", statut: "actif", createdAt: "2026-06-18" },
];

export const coursiers: Coursier[] = [
  { id: "c1", utilisateurId: "u1", documents: ["cni.jpg", "permis.jpg"], typeVehicule: "moto", statutVerification: "valide", disponibilite: true, noteMoyenne: 4.7 },
  { id: "c2", utilisateurId: "u2", documents: ["cni.jpg"], typeVehicule: "velo", statutVerification: "en_attente", disponibilite: false, noteMoyenne: 0 },
  { id: "c3", utilisateurId: "u3", documents: ["cni.jpg", "carte_grise.jpg"], typeVehicule: "voiture", statutVerification: "rejete", disponibilite: false, noteMoyenne: 3.2 },
];

export const courses: Course[] = [
  {
    id: "co1", clientId: "u4", coursierId: "u1",
    adresseDepart: "Quartier Louis, Libreville", adresseArrivee: "Nombakélé, Libreville",
    zoneDepart: "libreville", zoneArrivee: "libreville",
    typeColis: "Documents", livraisonPrioritaire: false,
    prix: 2000, statut: "en_cours", createdAt: "2026-07-20T08:12:00Z",
  },
  {
    id: "co2", clientId: "u5", coursierId: null,
    adresseDepart: "Akanda centre", adresseArrivee: "Owendo marché",
    zoneDepart: "akanda", zoneArrivee: "owendo",
    typeColis: "Colis moyen", livraisonPrioritaire: true,
    prix: 3500, statut: "en_attente", createdAt: "2026-07-20T09:03:00Z",
  },
  {
    id: "co3", clientId: "u4", coursierId: "u3",
    adresseDepart: "Libreville centre-ville", adresseArrivee: "Ntoum",
    zoneDepart: "libreville", zoneArrivee: "ntoum",
    typeColis: "Colis fragile", livraisonPrioritaire: false, valeurDeclaree: 25000,
    prix: 5600, statut: "litige", createdAt: "2026-07-19T14:40:00Z",
  },
  {
    id: "co4", clientId: "u5", coursierId: "u1",
    adresseDepart: "Owendo port", adresseArrivee: "Libreville, Batterie IV",
    zoneDepart: "owendo", zoneArrivee: "libreville",
    typeColis: "Colis volumineux", livraisonPrioritaire: false,
    prix: 2800, statut: "confirmee", createdAt: "2026-07-18T11:20:00Z",
  },
];

export const notations: Notation[] = [];

export function findUtilisateur(id: string): Utilisateur | undefined {
  return utilisateurs.find((u) => u.id === id);
}

export function findCoursierByUtilisateur(utilisateurId: string): Coursier | undefined {
  return coursiers.find((c) => c.utilisateurId === utilisateurId);
}

export function creerInscriptionCoursier(input: {
  nom: string;
  telephone: string;
  zone: Zone;
  typeVehicule: Coursier["typeVehicule"];
  documents: string[];
}): { utilisateur: Utilisateur; coursier: Coursier } {
  const utilisateur: Utilisateur = {
    id: nextId("u"),
    nom: input.nom,
    telephone: input.telephone,
    type: "coursier",
    zone: input.zone,
    statut: "actif",
    createdAt: new Date().toISOString(),
  };
  utilisateurs.push(utilisateur);

  const coursier: Coursier = {
    id: nextId("c"),
    utilisateurId: utilisateur.id,
    documents: input.documents,
    typeVehicule: input.typeVehicule,
    statutVerification: "en_attente" as VerificationStatus,
    disponibilite: false,
    noteMoyenne: 0,
  };
  coursiers.push(coursier);

  return { utilisateur, coursier };
}
