import { ZONE_LABELS, isRouteDesservie, type Zone } from "@colimo/shared";

export const MODELE_CSV_COMMANDES_MASSE =
  "nom_destinataire,telephone_destinataire,adresse_arrivee,zone_arrivee,type_colis,instructions,valeur_declaree,livraison_prioritaire\n" +
  'Jean Ndong,+24177123456,"Immeuble Alpha, Montagne Sainte",libreville,Documents,Appeler avant d\'arriver,,non\n' +
  "Marie Obame,+24166987654,Quartier Nzeng-Ayong,libreville,Vêtements,,15000,oui\n";

function normaliser(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const ZONES_PAR_CLE: Record<string, Zone> = {};
(Object.keys(ZONE_LABELS) as Zone[]).forEach((zone) => {
  ZONES_PAR_CLE[zone] = zone;
  ZONES_PAR_CLE[normaliser(ZONE_LABELS[zone])] = zone;
});

function resoudreZone(valeur: string): Zone | null {
  return ZONES_PAR_CLE[normaliser(valeur)] ?? null;
}

function resoudreBooleen(valeur: string): boolean {
  return ["oui", "yes", "true", "1"].includes(normaliser(valeur));
}

// Parseur CSV minimal (RFC 4180) : gère les champs entre guillemets pouvant
// contenir des virgules ou des guillemets échappés (""). Pas de dépendance
// externe — le format attendu est simple (une commande = une ligne).
function parserLignesCsv(contenu: string): string[][] {
  const lignes: string[][] = [];
  let ligneCourante: string[] = [];
  let champ = "";
  let dansGuillemets = false;
  const texte = contenu.replace(/\r\n/g, "\n");

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i++;
        } else {
          dansGuillemets = false;
        }
      } else {
        champ += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === ",") {
      ligneCourante.push(champ);
      champ = "";
    } else if (c === "\n") {
      ligneCourante.push(champ);
      lignes.push(ligneCourante);
      ligneCourante = [];
      champ = "";
    } else {
      champ += c;
    }
  }
  if (champ.length > 0 || ligneCourante.length > 0) {
    ligneCourante.push(champ);
    lignes.push(ligneCourante);
  }
  return lignes.filter((l) => l.some((v) => v.trim().length > 0));
}

export interface LigneCommandeMasseValide {
  ligne: number;
  nomDestinataire: string;
  telephoneDestinataire: string;
  adresseArrivee: string;
  zoneArrivee: Zone;
  typeColis: string;
  instructions?: string;
  valeurDeclaree?: number;
  livraisonPrioritaire: boolean;
}

export interface LigneCommandeMasseInvalide {
  ligne: number;
  erreurs: string[];
}

export interface ResultatParsingCommandesMasse {
  valides: LigneCommandeMasseValide[];
  invalides: LigneCommandeMasseInvalide[];
}

// zoneDepart est fixée une fois pour tout le lot (l'adresse de retrait est
// la même pour toutes les commandes d'un import — même principe que
// nouvelle-livraison.tsx pour une commande unique) : la desserte de chaque
// trajet est donc vérifiable dès le parsing.
export function parserCommandesMasse(contenu: string, zoneDepart: Zone): ResultatParsingCommandesMasse {
  const lignesBrutes = parserLignesCsv(contenu);
  const valides: LigneCommandeMasseValide[] = [];
  const invalides: LigneCommandeMasseInvalide[] = [];
  if (lignesBrutes.length < 2) return { valides, invalides };

  const entete = lignesBrutes[0].map((c) => normaliser(c).replace(/\s+/g, "_"));
  const indexColonne = (colonne: string) => entete.indexOf(colonne);

  for (let i = 1; i < lignesBrutes.length; i++) {
    const brut = lignesBrutes[i];
    const numeroLigne = i + 1; // +1 : la ligne 1 est l'en-tête
    const valeur = (colonne: string) => {
      const idx = indexColonne(colonne);
      return idx >= 0 ? (brut[idx] ?? "").trim() : "";
    };

    const erreurs: string[] = [];
    const nomDestinataire = valeur("nom_destinataire");
    const telephoneDestinataire = valeur("telephone_destinataire");
    const adresseArrivee = valeur("adresse_arrivee");
    const zoneArriveeTexte = valeur("zone_arrivee");
    const typeColis = valeur("type_colis");
    const instructions = valeur("instructions");
    const valeurDeclareeTexte = valeur("valeur_declaree");
    const livraisonPrioritaireTexte = valeur("livraison_prioritaire");

    if (!nomDestinataire) erreurs.push("Nom du destinataire manquant");
    if (!telephoneDestinataire) erreurs.push("Téléphone du destinataire manquant");
    if (!adresseArrivee) erreurs.push("Adresse de livraison manquante");
    if (!typeColis) erreurs.push("Nature du colis manquante");

    const zoneArrivee = zoneArriveeTexte ? resoudreZone(zoneArriveeTexte) : null;
    if (!zoneArriveeTexte) {
      erreurs.push("Zone de livraison manquante");
    } else if (!zoneArrivee) {
      erreurs.push(`Zone "${zoneArriveeTexte}" inconnue`);
    } else if (!isRouteDesservie(zoneDepart, zoneArrivee)) {
      erreurs.push(`Trajet ${ZONE_LABELS[zoneDepart]} → ${ZONE_LABELS[zoneArrivee]} pas encore desservi`);
    }

    let valeurDeclaree: number | undefined;
    if (valeurDeclareeTexte) {
      const n = Number(valeurDeclareeTexte.replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(n) || n < 0) {
        erreurs.push("Valeur déclarée invalide");
      } else {
        valeurDeclaree = n;
      }
    }

    if (erreurs.length > 0 || !zoneArrivee) {
      invalides.push({ ligne: numeroLigne, erreurs });
      continue;
    }

    valides.push({
      ligne: numeroLigne,
      nomDestinataire,
      telephoneDestinataire,
      adresseArrivee,
      zoneArrivee,
      typeColis,
      instructions: instructions || undefined,
      valeurDeclaree,
      livraisonPrioritaire: resoudreBooleen(livraisonPrioritaireTexte),
    });
  }

  return { valides, invalides };
}
