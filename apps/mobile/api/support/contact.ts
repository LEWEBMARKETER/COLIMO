// Formulaire de contact support (onglet "Support") — envoie un email réel
// vers la boîte support via SMTP (nodemailer), sans jamais exposer
// d'identifiants côté client : les variables SUPPORT_SMTP_* ne vivent que
// dans l'environnement serverless Vercel. Indépendant du Communication
// Center (packages/shared/src/communication) : celui-ci envoie des
// notifications templatées DE Colimo VERS un utilisateur pour des
// événements de plateforme (course créée, litige...) ; ici c'est l'inverse,
// un message libre écrit par l'utilisateur, envoyé VERS la boîte support.
import nodemailer from "nodemailer";

interface ApiRequest {
  method?: string;
  body: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
}

const LONGUEUR_MAX_NOM = 200;
const LONGUEUR_MAX_SUJET = 200;
const LONGUEUR_MAX_MESSAGE = 5000;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ erreur: "Méthode non autorisée." });
    return;
  }

  const smtpHost = process.env.SUPPORT_SMTP_HOST;
  const smtpPort = Number(process.env.SUPPORT_SMTP_PORT ?? "587");
  const smtpUser = process.env.SUPPORT_SMTP_USER;
  const smtpPassword = process.env.SUPPORT_SMTP_PASSWORD;
  const destinataire = process.env.SUPPORT_EMAIL_DESTINATAIRE ?? "contact@colimo.online";

  if (!smtpHost || !smtpUser || !smtpPassword) {
    res.status(500).json({ erreur: "Le formulaire de contact n'est pas configuré côté serveur." });
    return;
  }

  const body = (req.body ?? {}) as { nom?: string; email?: string; sujet?: string; message?: string };
  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const sujet = typeof body.sujet === "string" ? body.sujet.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  // Validation côté serveur — jamais confiance dans la validation frontend seule.
  if (!nom || !email || !sujet || !message) {
    res.status(400).json({ erreur: "Nom, email, objet et message sont requis." });
    return;
  }
  if (!REGEX_EMAIL.test(email)) {
    res.status(400).json({ erreur: "Adresse email invalide." });
    return;
  }
  if (nom.length > LONGUEUR_MAX_NOM || sujet.length > LONGUEUR_MAX_SUJET || message.length > LONGUEUR_MAX_MESSAGE) {
    res.status(400).json({ erreur: "Un des champs dépasse la longueur maximale autorisée." });
    return;
  }

  try {
    const transporteur = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    await transporteur.sendMail({
      from: `"Support COLIMO (formulaire)" <${smtpUser}>`,
      to: destinataire,
      replyTo: `"${nom}" <${email}>`,
      subject: `[Support COLIMO] ${sujet}`,
      text: `Nouveau message via le formulaire de support de l'app.\n\nNom : ${nom}\nEmail : ${email}\nObjet : ${sujet}\n\nMessage :\n${message}`,
    });
    res.status(200).json({ envoye: true });
  } catch {
    res.status(502).json({ erreur: "Impossible d'envoyer le message pour le moment. Réessayez plus tard." });
  }
}
