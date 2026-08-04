// Campagnes (envois groupés/planifiés à un segment d'utilisateurs) —
// prévu dans l'architecture du Communication Center, non implémenté à ce
// stade. Ce fichier existe pour réserver l'emplacement : le jour où cette
// fonctionnalité sera construite, elle vivra ici et consommera
// `communication.send()` comme n'importe quel autre déclencheur, sans rien
// changer au reste du module.
export interface Campagne {
  id: string;
  nom: string;
  canal: "email" | "sms" | "whatsapp" | "push";
  modeleCode: string;
  statut: "brouillon" | "planifiee" | "envoyee";
}
