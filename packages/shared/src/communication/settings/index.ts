// Réglages du Communication Center : quel fournisseur est actif sur chaque
// canal. Remplacer un fournisseur (ex. brancher Resend pour l'email) se
// fait en un seul appel à `configurerFournisseurEmail`, au démarrage de
// l'application — aucune autre partie du code n'a besoin d'être modifiée.
// C'est le seul endroit qui connaît quel fournisseur est actif.
import {
  MockEmailProvider,
  MockPushProvider,
  MockSMSProvider,
  MockWhatsAppProvider,
  type EmailProvider,
  type PushProvider,
  type SMSProvider,
  type WhatsAppProvider,
} from "../providers";

let fournisseurEmail: EmailProvider = MockEmailProvider;
let fournisseurSMS: SMSProvider = MockSMSProvider;
let fournisseurWhatsApp: WhatsAppProvider = MockWhatsAppProvider;
let fournisseurPush: PushProvider = MockPushProvider;

export function configurerFournisseurEmail(fournisseur: EmailProvider): void {
  fournisseurEmail = fournisseur;
}
export function configurerFournisseurSMS(fournisseur: SMSProvider): void {
  fournisseurSMS = fournisseur;
}
export function configurerFournisseurWhatsApp(fournisseur: WhatsAppProvider): void {
  fournisseurWhatsApp = fournisseur;
}
export function configurerFournisseurPush(fournisseur: PushProvider): void {
  fournisseurPush = fournisseur;
}

export function getFournisseurEmail(): EmailProvider {
  return fournisseurEmail;
}
export function getFournisseurSMS(): SMSProvider {
  return fournisseurSMS;
}
export function getFournisseurWhatsApp(): WhatsAppProvider {
  return fournisseurWhatsApp;
}
export function getFournisseurPush(): PushProvider {
  return fournisseurPush;
}
