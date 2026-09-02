// Règles de validation du mot de passe — fonction pure, réutilisée par
// l'écran de réinitialisation (et potentiellement l'inscription plus tard).
// Retourne le premier message d'erreur applicable, ou null si le mot de
// passe est valide.
export function validerMotDePasse(motDePasse: string): string | null {
  if (motDePasse.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[a-zA-Z]/.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins une lettre.";
  }
  if (!/[0-9]/.test(motDePasse)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  return null;
}

export function motDePasseContientCaractereSpecial(motDePasse: string): boolean {
  return /[^a-zA-Z0-9]/.test(motDePasse);
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValide(email: string): boolean {
  return REGEX_EMAIL.test(email.trim());
}
