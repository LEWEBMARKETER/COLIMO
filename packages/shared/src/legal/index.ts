export interface SectionLegale {
  titre: string;
  paragraphes: string[];
}

export const CGU_DERNIERE_MAJ = "Version provisoire — en attente de validation juridique";

export const CGU: SectionLegale[] = [
  {
    titre: "1. Objet",
    paragraphes: [
      "Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation de la plateforme COLIMO (application mobile/web et back-office).",
      "COLIMO met en relation des Clients (particuliers ou commerces) souhaitant faire livrer un colis et des Coursiers, indépendants ou salariés d'une structure de livraison partenaire, sur les zones de Libreville, Akanda, Owendo, PK12, Bikélé et Ntoum (Gabon), susceptibles d'évoluer.",
      "L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU.",
    ],
  },
  {
    titre: "2. Comptes utilisateurs",
    paragraphes: [
      "Client : toute personne physique (particulier) ou tout commerce (restaurant, pharmacie, boutique, e-commerçant) peut créer un compte Client pour publier des demandes de course. Un compte est personnel (ou propre au commerce déclaré) et non transférable.",
      "Coursier : deux profils sont acceptés, les coursiers indépendants qui s'inscrivent individuellement avec leur propre moyen de transport, et les structures de livraison, entreprises disposant de plusieurs coursiers salariés.",
      "L'inscription en tant que Coursier nécessite la fourniture d'une pièce d'identité valide (CNI, passeport, carte de séjour ou permis de conduire). Le compte n'est activé qu'après validation manuelle par l'équipe COLIMO.",
      "L'utilisateur s'engage à fournir des informations exactes et à jour. Toute fausse déclaration peut entraîner la suspension du compte.",
    ],
  },
  {
    titre: "3. Rôle de COLIMO et fonctionnement du service",
    paragraphes: [
      "COLIMO agit en tant qu'intermédiaire technique mettant en relation Clients et Coursiers ; elle n'est pas elle-même transporteur.",
      "Le Client publie une demande de course (adresses, catégorie et description du colis, options) ; un tarif est calculé automatiquement et un numéro de commande unique est attribué. La demande est proposée aux Coursiers disponibles dans la zone de départ. Le statut de la course est mis à jour à chaque étape et un échange par messagerie est disponible entre Client et Coursier. Client et Coursier peuvent se noter mutuellement à l'issue de la course.",
    ],
  },
  {
    titre: "4. Tarification et paiement",
    paragraphes: [
      "Les tarifs affichés sont indicatifs et calculés automatiquement selon la zone de départ et d'arrivée. Le Client voit le prix estimé avant de confirmer sa demande. COLIMO perçoit une commission sur chaque course, quel que soit le mode de paiement retenu.",
      "Deux modes de paiement sont proposés : Mobile Money (Airtel Money ou Moov Money — intégration technique pas encore active à ce stade) ou paiement à la livraison en espèces directement au Coursier.",
    ],
  },
  {
    titre: "5. Reversement des commissions sur paiement en espèces",
    paragraphes: [
      "Lorsqu'une course est réglée en espèces, le Coursier (ou la structure) encaisse directement le montant. Un contrat distinct entre COLIMO et le Coursier fixe le pourcentage de commission dû à la plateforme et les modalités de reversement. Le non-respect de ces obligations peut entraîner la suspension du compte.",
    ],
  },
  {
    titre: "6. Obligations du Coursier",
    paragraphes: [
      "Fournir des documents d'identité et de véhicule authentiques, exécuter les courses acceptées avec diligence, respecter les règles de sécurité routière en vigueur au Gabon, et honorer ses obligations de reversement de commission.",
    ],
  },
  {
    titre: "7. Obligations du Client",
    paragraphes: [
      "Fournir des informations exactes sur le colis et l'adresse de livraison, confirmer la réception dans des délais raisonnables, régler le montant dû selon le mode de paiement choisi. Les colis interdits, dangereux ou illicites sont proscrits.",
    ],
  },
  {
    titre: "8. Responsabilité",
    paragraphes: [
      "COLIMO met tout en œuvre pour assurer la fiabilité de la mise en relation mais ne garantit pas la disponibilité continue du service. Le Coursier est seul responsable de la bonne exécution de la livraison. COLIMO n'est pas assureur du contenu transporté, sauf souscription à l'option assurance colis.",
    ],
  },
  {
    titre: "9. Litiges et modération",
    paragraphes: [
      "En cas de litige (colis endommagé, perdu, retard, comportement), chaque partie peut signaler un problème via l'application. COLIMO examine l'historique de la course et peut arbitrer, rembourser, avertir ou suspendre un compte selon la gravité constatée.",
    ],
  },
  {
    titre: "10. Suspension et résiliation",
    paragraphes: [
      "Tout utilisateur peut demander la suppression de son compte à tout moment. COLIMO peut suspendre ou résilier un compte en cas de violation des présentes CGU, de fraude, ou de manquement aux obligations de reversement de commission.",
    ],
  },
  {
    titre: "11. Données personnelles",
    paragraphes: ["Le traitement des données personnelles est décrit dans notre Politique de confidentialité."],
  },
  {
    titre: "12. Modification des CGU",
    paragraphes: [
      "COLIMO peut modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle avant son entrée en vigueur.",
    ],
  },
  {
    titre: "13. Droit applicable",
    paragraphes: [
      "Les présentes CGU sont soumises au droit gabonais. En cas de litige, une solution amiable sera recherchée avant toute action contentieuse devant les juridictions compétentes du Gabon.",
    ],
  },
];

export const CONFIDENTIALITE_DERNIERE_MAJ = "Version provisoire — en attente de validation juridique";

export const CONFIDENTIALITE: SectionLegale[] = [
  {
    titre: "1. Données collectées",
    paragraphes: [
      "Nom (ou nom du commerce), prénom, téléphone, email — création de compte et communication liée aux courses.",
      "Photo de profil ou logo du commerce — personnalisation du profil affiché à l'autre partie.",
      "Zone d'activité — mise en relation géographique.",
      "Pièce d'identité (coursier) — vérification et validation de l'inscription.",
      "Adresses, catégorie et description du colis, valeur déclarée — exécution de la course, calcul du tarif.",
      "Mode de paiement choisi et, pour les paiements en espèces, l'historique des sommes dues et reversées — traitement des paiements.",
      "Messages échangés entre Client et Coursier pour une course — coordination de la livraison.",
      "Notes et commentaires laissés après une course, historique des courses — fiabilité et suivi du service.",
      "Les pièces d'identité constituent une donnée sensible : leur collecte est strictement limitée à la vérification de l'inscription des Coursiers, n'est accessible qu'à l'équipe d'administration COLIMO, et n'est jamais partagée avec les Clients.",
    ],
  },
  {
    titre: "2. Base légale et finalités",
    paragraphes: [
      "Les données sont traitées sur la base de l'exécution du contrat (création de compte, mise en relation, exécution des courses), de l'intérêt légitime de COLIMO (sécurité, prévention de la fraude, amélioration du service), et du consentement lorsque requis.",
    ],
  },
  {
    titre: "3. Destinataires des données",
    paragraphes: [
      "Les équipes internes de COLIMO habilitées (validation des coursiers, support, gestion des litiges).",
      "Le Coursier assigné à une course a accès aux informations strictement nécessaires à la livraison, uniquement pour la durée de celle-ci.",
      "Notre hébergeur technique (base de données, stockage des documents et infrastructure), lié par un contrat de sous-traitance.",
      "À venir : l'opérateur ou l'agrégateur Mobile Money, lors de l'activation du paiement en ligne.",
      "Aucune donnée n'est vendue à des tiers.",
    ],
  },
  {
    titre: "4. Durée de conservation",
    paragraphes: [
      "Les données de compte actif sont conservées pendant la durée d'utilisation du service. L'historique des courses est conservé à des fins de preuve et de gestion des litiges. Les pièces justificatives des coursiers rejetés ou inactifs sont supprimées après un délai défini.",
    ],
  },
  {
    titre: "5. Sécurité",
    paragraphes: [
      "Les données sont stockées sur une infrastructure sécurisée avec contrôle d'accès par rôle. L'accès aux informations est restreint selon le profil de l'utilisateur.",
    ],
  },
  {
    titre: "6. Droits des utilisateurs",
    paragraphes: [
      "Conformément à la réglementation applicable, chaque utilisateur dispose d'un droit d'accès, de rectification, de suppression et d'opposition concernant ses données personnelles.",
    ],
  },
  {
    titre: "7. Modification de la politique",
    paragraphes: [
      "Cette politique peut être mise à jour ; les utilisateurs seront informés de toute modification substantielle.",
    ],
  },
];
