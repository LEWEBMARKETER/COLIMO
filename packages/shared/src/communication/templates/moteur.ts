// Moteur de gabarits : remplace {{variable}} par sa valeur. Les modèles
// eux-mêmes ne sont jamais codés en dur — ils vivent dans la table
// modeles_notification, éditable depuis l'admin (section Templates du
// Communication Center). Une variable manquante reste affichée telle
// quelle ({{variable}}) plutôt que de faire échouer l'envoi.
export function interpolerModele(contenu: string, variables: Record<string, string>): string {
  return contenu.replace(/\{\{\s*(\w+)\s*\}\}/g, (correspondance, cle: string) => variables[cle] ?? correspondance);
}
