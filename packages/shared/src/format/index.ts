export function formatFCFA(montant: number): string {
  return `${montant.toLocaleString("fr-FR")} FCFA`;
}

export function formatDistanceM(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export function formatDureeSecondes(secondes: number): string {
  const minutes = Math.round(secondes / 60);
  if (minutes < 1) return "moins d'1 min";
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste > 0 ? `${heures} h ${reste} min` : `${heures} h`;
}

/**
 * Vérifie qu'une URL stockée en base (capture de paiement, preuve de
 * litige...) utilise bien un schéma http(s) avant de la rendre dans un
 * attribut href — ces champs sont insérés tels quels par des fonctions
 * client-callable (declarerPaiement, creerLitige) sans validation serveur
 * du format, un payload "javascript:..." exécuterait sinon du code dans la
 * session admin au clic.
 */
export function estUrlHttpSure(url: string): boolean {
  // Les navigateurs ignorent tab/CR/LF n'importe où dans une URL avant d'en
  // évaluer le schéma (ex. "java\tscript:...") : on les retire avant de
  // tester, sans quoi ce filtre serait contournable.
  const normalisee = url.replace(/[\t\r\n]/g, "").trim();
  return /^https?:\/\//i.test(normalisee);
}
