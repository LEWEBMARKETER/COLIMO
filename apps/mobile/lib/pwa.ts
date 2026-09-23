import { useEffect, useState } from "react";
import { Platform } from "react-native";

// API navigateur non standardisée (Chrome/Edge/Android uniquement) — pas de
// typage officiel dans lib.dom.
interface EvenementInstallationPwa extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function estAffichageStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // Safari iOS expose ce flag plutôt que l'API display-mode standard.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function estIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

interface EtatInstallationPwa {
  // L'app tourne déjà installée (standalone) — rien à proposer.
  dejaInstallee: boolean;
  // beforeinstallprompt capturé (Chrome/Edge/Android) : bouton d'installation direct possible.
  installationDirecte: boolean;
  // iOS Safari n'expose aucune API d'installation : afficher les instructions manuelles à la place.
  instructionsManuelles: boolean;
  installer: () => Promise<void>;
}

// Web uniquement (Platform.OS !== "web" → rien à proposer, l'app native
// n'a pas de notion d'installation PWA). Écoute beforeinstallprompt une
// seule fois au montage : l'événement n'est émis par le navigateur qu'une
// fois par session de navigation, avant toute interaction avec ce hook.
export function useInstallationPwa(): EtatInstallationPwa {
  const [evenement, setEvenement] = useState<EvenementInstallationPwa | null>(null);
  const [dejaInstallee, setDejaInstallee] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    setDejaInstallee(estAffichageStandalone());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setEvenement(e as EvenementInstallationPwa);
    }
    function onAppInstalled() {
      setEvenement(null);
      setDejaInstallee(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    await evenement.userChoice;
    setEvenement(null);
  }

  return {
    dejaInstallee,
    installationDirecte: Platform.OS === "web" && !dejaInstallee && evenement !== null,
    instructionsManuelles: Platform.OS === "web" && !dejaInstallee && evenement === null && estIosSafari(),
    installer,
  };
}
