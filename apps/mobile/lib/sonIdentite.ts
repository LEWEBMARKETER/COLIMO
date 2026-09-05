// Identité sonore COLIMO — un motif court et reconnaissable (3 notes),
// synthétisé via Web Audio API (aucun fichier audio à héberger), joué au
// premier plan sur les événements clés : nouvelle notification reçue
// (ClocheNotifications), et actions de confirmation critiques (code de
// réception validé, livraison confirmée).
//
// Les notifications push web (app fermée/arrière-plan) ne permettent plus de
// son personnalisé sur les navigateurs modernes — ce motif n'est donc fiable
// que lorsque l'app est ouverte au premier plan. Web uniquement (indisponible
// en natif, comme le reste du système de notifications de ce projet).

const CLE_PREFERENCE = "colimo_son_notifications";

let contexteAudio: AudioContext | null = null;

function obtenirContexte(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClasse = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClasse) return null;
  if (!contexteAudio) contexteAudio = new AudioContextClasse();
  return contexteAudio;
}

export function sonNotificationsActive(): boolean {
  try {
    return typeof window !== "undefined" && localStorage.getItem(CLE_PREFERENCE) !== "0";
  } catch {
    return true;
  }
}

export function definirSonNotificationsActive(actif: boolean): void {
  try {
    localStorage.setItem(CLE_PREFERENCE, actif ? "1" : "0");
  } catch {
    // localStorage indisponible (navigation privée...) : préférence non persistée, son actif par défaut.
  }
}

function jouerNote(contexte: AudioContext, frequence: number, debut: number, duree: number, gainMax: number) {
  const oscillateur = contexte.createOscillator();
  const gain = contexte.createGain();
  oscillateur.type = "triangle";
  oscillateur.frequency.value = frequence;
  gain.gain.setValueAtTime(0, debut);
  gain.gain.linearRampToValueAtTime(gainMax, debut + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  oscillateur.connect(gain);
  gain.connect(contexte.destination);
  oscillateur.start(debut);
  oscillateur.stop(debut + duree + 0.02);
}

// Motif signature : trois notes ascendantes (sol5 → do6 → mi6), timbre
// chaleureux (onde triangle) plutôt qu'un bip électronique — volontairement
// bref (~350 ms) pour rester discret tout en étant reconnaissable. Un seul
// motif partout : c'est la répétition à l'identique qui construit
// l'identité sonore, pas une variante par écran.
export function jouerIdentiteSonoreColimo(): void {
  if (!sonNotificationsActive()) return;
  const contexte = obtenirContexte();
  if (!contexte) return;
  if (contexte.state === "suspended") contexte.resume().catch(() => {});

  const maintenant = contexte.currentTime;
  jouerNote(contexte, 783.99, maintenant, 0.13, 0.16); // Sol5
  jouerNote(contexte, 1046.5, maintenant + 0.1, 0.13, 0.16); // Do6
  jouerNote(contexte, 1318.5, maintenant + 0.2, 0.22, 0.18); // Mi6
}
