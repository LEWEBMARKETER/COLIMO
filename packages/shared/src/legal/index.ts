export interface SectionLegale {
  titre: string;
  paragraphes: string[];
}

export const CGU_DERNIERE_MAJ = "Dernière mise à jour : 30 juillet 2026";

export const CGU: SectionLegale[] = [
  {
    titre: "1. Objet",
    paragraphes: [
      "Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'utilisation de la plateforme COLIMO (application mobile/web et back-office).",
      "COLIMO est une plateforme de mise en relation entre Clients (particuliers ou commerces), Commerçants et Coursiers, permettant de commander un produit, de demander une livraison ou de faire transporter tout type de colis et marchandises, sur les zones de Libreville, Akanda, Owendo, PK12, Bikélé et Ntoum (Gabon), susceptibles d'évoluer.",
    ],
  },
  {
    titre: "2. Acceptation",
    paragraphes: ["Toute utilisation de COLIMO implique l'acceptation pleine et entière des présentes conditions."],
  },
  {
    titre: "3. Création de compte",
    paragraphes: [
      "L'utilisateur s'engage à fournir des informations exactes et à maintenir leur mise à jour (nom, téléphone, zone, documents). Un compte est personnel (ou propre au commerce déclaré) et non transférable. Toute fausse déclaration peut entraîner la suspension du compte.",
      "L'inscription en tant que Coursier nécessite en plus la fourniture d'une pièce d'identité valide (CNI, passeport, carte de séjour ou permis de conduire) et, selon le véhicule utilisé, des documents complémentaires. Le compte n'est activé qu'après validation manuelle par l'équipe COLIMO ; le motif est communiqué en cas de refus.",
    ],
  },
  {
    titre: "4. Responsabilités",
    paragraphes: [
      "COLIMO agit en qualité de plateforme de mise en relation et s'engage à fournir un service fiable, tout en mettant en œuvre des moyens raisonnables pour assurer le bon déroulement des livraisons. COLIMO n'est pas elle-même transporteur.",
      "Clients : les clients s'engagent à fournir des informations exactes, à être joignables et à respecter les conditions de paiement.",
      "Commerçants : les commerçants sont responsables de la qualité, de la conformité et de la disponibilité des produits proposés.",
      "Coursiers : les coursiers s'engagent à effectuer les livraisons avec professionnalisme, dans le respect des délais, des règles de sécurité et de la législation applicable au Gabon.",
    ],
  },
  {
    titre: "5. Paiements",
    paragraphes: [
      "Deux modes de paiement sont proposés au moment de la confirmation de la commande : le paiement Mobile Money (Airtel Money ou Moov Money — l'intégration technique de ce mode de paiement n'est pas encore active à ce stade), ou le paiement à la livraison, réglé directement au coursier en espèces.",
      "Lorsqu'une course est réglée en espèces, un contrat distinct entre COLIMO et le coursier (ou la structure de livraison) fixe le pourcentage de commission dû à la plateforme ainsi que les modalités de reversement.",
    ],
  },
  {
    titre: "6. Annulation",
    paragraphes: [
      "Les conditions d'annulation dépendent de l'état de la commande. Des frais peuvent s'appliquer lorsque la préparation ou la livraison a déjà commencé.",
    ],
  },
  {
    titre: "7. Retour de colis",
    paragraphes: [
      "Lorsqu'une livraison ne peut pas aboutir et que le colis doit être retourné, des frais de retour correspondant à 50% du prix de la course restent à la charge du Client, le Coursier ayant déjà effectué le déplacement nécessaire à la tentative de livraison.",
    ],
  },
  {
    titre: "8. Litiges",
    paragraphes: [
      "Tout litige doit être déclaré depuis l'application dans les 24 heures suivant la livraison. COLIMO met en œuvre une procédure de médiation avant toute autre démarche.",
      "Déclaration : le Client (ou le Coursier) ouvre un litige directement depuis la course et sélectionne un motif (produit manquant, produit endommagé, erreur de commande, retard important, comportement inapproprié, colis non reçu, ou autre).",
      "Constitution du dossier : chaque partie peut transmettre photos, vidéos, captures d'écran ou commentaires à l'appui de sa déclaration.",
      "Analyse : le service qualité COLIMO examine les éléments transmis et, si nécessaire, contacte les parties et vérifie l'historique et les statuts de la course.",
      "Décision : une réponse est généralement apportée sous 48 à 72 heures ouvrables : confirmation de la livraison, remboursement total ou partiel, retour de colis (frais de 50% à la charge du Client, cf. article 7), ou rejet motivé de la demande.",
    ],
  },
  {
    titre: "9. Suspension des comptes",
    paragraphes: [
      "COLIMO peut suspendre ou supprimer un compte en cas de fraude, d'usurpation d'identité, d'utilisation abusive de la plateforme, de manquement aux obligations de reversement de commission, ou de non-respect des présentes CGU.",
    ],
  },
  {
    titre: "10. Limitation de responsabilité",
    paragraphes: [
      "COLIMO ne pourra être tenue responsable des dommages résultant d'informations erronées fournies par les utilisateurs, de cas de force majeure ou de faits imputables aux partenaires, sauf faute qui lui serait directement imputable. COLIMO n'est pas assureur du contenu transporté, sauf souscription à l'option assurance colis.",
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
      "Les présentes CGU sont régies par le droit en vigueur en République Gabonaise. En cas de litige persistant après la procédure de médiation, une solution amiable sera recherchée avant toute action contentieuse devant les juridictions compétentes du Gabon.",
    ],
  },
];

export const CONFIDENTIALITE_DERNIERE_MAJ = "Dernière mise à jour : 30 juillet 2026";

export const CONFIDENTIALITE: SectionLegale[] = [
  {
    titre: "1. Données collectées",
    paragraphes: [
      "Nom (ou nom du commerce), prénom, numéro de téléphone, e-mail — création et gestion du compte, authentification, communication liée aux courses.",
      "Photo de profil ou logo du commerce — personnalisation du profil affiché à l'autre partie.",
      "Zone (Libreville, Akanda, Owendo, PK12, Bikélé, Ntoum) — mise en relation géographique, affichage des courses disponibles.",
      "Pièce d'identité (CNI, passeport, carte de séjour ou permis de conduire, pour les Coursiers) — vérification de l'identité et validation de l'inscription.",
      "Adresses de livraison, position GPS pendant les livraisons — organisation et suivi des livraisons.",
      "Historique des commandes et des paiements — traitement des commandes, support, statistiques internes.",
      "Messages échangés entre Client et Coursier pour une course — coordination de la livraison.",
      "Notes, commentaires et pièces jointes (photos/vidéos) lors d'un litige — gestion et médiation des litiges.",
      "Les pièces d'identité constituent une donnée sensible : leur collecte est strictement limitée à la vérification de l'inscription des Coursiers, n'est accessible qu'à l'équipe d'administration COLIMO, et n'est jamais partagée avec les Clients.",
    ],
  },
  {
    titre: "2. Finalités",
    paragraphes: [
      "Les données sont utilisées pour créer et gérer votre compte, traiter vos commandes, organiser les livraisons, assurer le service client (y compris la gestion des litiges), améliorer la qualité du service, et prévenir la fraude et sécuriser la plateforme.",
    ],
  },
  {
    titre: "3. Partage des données",
    paragraphes: [
      "Les données ne sont partagées qu'avec les intervenants nécessaires à l'exécution du service : le commerçant concerné, le coursier assigné à une course (informations strictement nécessaires à la livraison, uniquement pour la durée de celle-ci), les prestataires de paiement, ainsi que les prestataires techniques (hébergement, infrastructure) lorsque cela est nécessaire, liés par un contrat de sous-traitance.",
      "COLIMO ne vend pas les données personnelles de ses utilisateurs.",
    ],
  },
  {
    titre: "4. Sécurité",
    paragraphes: [
      "COLIMO met en œuvre des mesures techniques et organisationnelles destinées à protéger les données contre tout accès non autorisé, perte, destruction ou divulgation, notamment un contrôle d'accès par rôle : un Client ne voit pas les données d'un autre Client, un Coursier ne voit pas les pièces d'identité des autres Coursiers, etc.",
    ],
  },
  {
    titre: "5. Durée de conservation",
    paragraphes: [
      "Les données sont conservées pendant la durée nécessaire à la gestion des services et au respect des obligations légales applicables : les données de compte actif pendant la durée d'utilisation du service, et l'historique des courses et des litiges à des fins de preuve et de gestion des litiges.",
    ],
  },
  {
    titre: "6. Vos droits",
    paragraphes: [
      "Sous réserve de la législation applicable, vous pouvez demander l'accès à vos données, la rectification de données inexactes, la suppression de votre compte lorsque cela est possible, la limitation de certains traitements, ou des informations sur l'utilisation de vos données. Les demandes peuvent être adressées au service client COLIMO.",
    ],
  },
  {
    titre: "7. Cookies et technologies similaires",
    paragraphes: [
      "Le site web et l'application peuvent utiliser des cookies et technologies similaires afin d'améliorer l'expérience utilisateur, de mémoriser certaines préférences et de produire des statistiques de fréquentation.",
    ],
  },
  {
    titre: "8. Évolution de la politique",
    paragraphes: [
      "Cette politique de confidentialité peut être mise à jour afin de tenir compte des évolutions légales, techniques ou des services proposés. Les utilisateurs seront informés des modifications importantes.",
    ],
  },
];
