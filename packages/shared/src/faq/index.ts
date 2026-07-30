export interface QuestionReponse {
  question: string;
  reponse: string;
}

export const FAQ: QuestionReponse[] = [
  {
    question: "Qu'est-ce que COLIMO ?",
    reponse:
      "COLIMO est une plateforme web et mobile qui met en relation, à Libreville et ses environs, des personnes ayant besoin d'une livraison avec des coursiers disponibles. Elle s'adresse aussi bien aux particuliers qu'aux commerces (restaurants, pharmacies, boutiques, e-commerçants) qui expédient régulièrement des colis.",
  },
  {
    question: "Quelles zones sont couvertes actuellement ?",
    reponse:
      "Au lancement, COLIMO couvre Libreville, Akanda, Owendo, PK12, Bikélé et Ntoum. L'extension vers l'intérieur du pays est prévue dans une phase ultérieure, une fois le service stabilisé sur ces zones pilotes.",
  },
  {
    question: "Qui peut devenir coursier sur COLIMO ?",
    reponse:
      "Deux profils sont acceptés : les coursiers indépendants, qui s'inscrivent individuellement avec leur propre moyen de transport (moto le plus souvent), et les structures de livraison, des entreprises disposant de plusieurs coursiers salariés. Dans les deux cas, une vérification d'identité et des documents (pièce d'identité, permis de conduire, carte grise du véhicule) est obligatoire avant toute activation du compte.",
  },
  {
    question: "Comment se passe la vérification d'un coursier ?",
    reponse:
      "Après l'inscription, le dossier du coursier (ou de la structure) est examiné manuellement par l'équipe COLIMO. Le compte reste inactif tant que la validation n'a pas été faite. En cas de refus, le motif est communiqué pour permettre une régularisation.",
  },
  {
    question: "Comment est calculé le prix d'une livraison ?",
    reponse:
      "Le tarif dépend de la zone de départ et de la zone d'arrivée, selon une grille fixée à l'avance. Le client voit le prix estimé avant de confirmer sa demande. Des options comme la livraison prioritaire ou l'assurance colis peuvent s'ajouter au tarif de base.",
  },
  {
    question: "Comment se fait le paiement ?",
    reponse:
      "Deux modes de paiement sont proposés au moment de la confirmation de la demande : le paiement Mobile Money (Airtel Money ou Moov Money, avec confirmation automatique) ou le paiement à la livraison, réglé directement au coursier en espèces. Dans ce dernier cas, un contrat entre le coursier (ou la structure) et COLIMO définit le pourcentage à reverser à la plateforme.",
  },
  {
    question: "Que se passe-t-il en cas de litige (colis endommagé, retard, comportement) ?",
    reponse:
      "Chaque partie peut signaler un problème via l'application. L'équipe COLIMO examine l'historique de la course et peut prendre différentes mesures : remboursement, avertissement, ou suspension du compte concerné en cas de manquement grave. Le système de notation mutuelle contribue aussi à identifier les comportements récurrents.",
  },
  {
    question: "Une entreprise peut-elle avoir plusieurs livraisons gérées en même temps ?",
    reponse:
      "Oui. Les commerces et entreprises qui expédient régulièrement peuvent utiliser un compte de type Commerce. Les particuliers, eux, peuvent utiliser la plateforme sans abonnement, à la course.",
  },
  {
    question: "Que faire si aucun coursier n'accepte ma demande ?",
    reponse:
      "Si aucun coursier disponible dans la zone n'accepte la course après un délai donné, la demande est automatiquement élargie à un périmètre plus large pour maximiser les chances de prise en charge. Le client reste informé de l'évolution de sa demande à chaque étape.",
  },
  {
    question: "Mes données personnelles et mes documents sont-ils protégés ?",
    reponse:
      "Oui. Les informations personnelles et les documents d'identité des coursiers sont stockés de façon sécurisée et ne sont accessibles qu'aux personnes autorisées (l'utilisateur concerné et l'équipe d'administration à des fins de vérification). Le détail complet de ces engagements figure dans la Politique de confidentialité.",
  },
];
