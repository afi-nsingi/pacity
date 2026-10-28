import { connect, type TLSSocket } from "node:tls";
import { randomUUID } from "node:crypto";

// Envoi d'e-mails par le serveur SMTP de Gmail, sans dépendance : Node sait ouvrir
// une connexion chiffrée (TLS, port 465) et le protocole SMTP tient en quelques commandes.
// Identifiants : GMAIL_USER (adresse) et GMAIL_APP_PASSWORD (mot de passe d'application
// Google), dans .env.local et dans les variables de Vercel, jamais dans le code.

const HOST = "smtp.gmail.com";
const SENDER_NAME = "Pacity";

export type Mail = { to: string; subject: string; html: string };

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
// Objet et nom d'expéditeur en UTF-8 (accents, emojis) selon la RFC 2047.
const encodeHeader = (s: string) => `=?UTF-8?B?${b64(s)}?=`;

/**
 * Lit les réponses du serveur. Une réponse peut tenir sur plusieurs lignes (« 250-… »)
 * et se termine par une ligne dont le code est suivi d'une espace (« 250 … »).
 */
function replies(socket: TLSSocket) {
  let buffer = "";
  let current = "";
  const queue: string[] = [];
  let waiting: ((r: string) => void) | null = null;
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    let eol: number;
    while ((eol = buffer.indexOf("\r\n")) !== -1) {
      const line = buffer.slice(0, eol);
      buffer = buffer.slice(eol + 2);
      current += line + "\r\n";
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        if (waiting) { waiting(current); waiting = null; } else queue.push(current);
        current = "";
      }
    }
  });
  return () => new Promise<string>((resolve) => {
    const next = queue.shift();
    if (next) resolve(next); else waiting = resolve;
  });
}

async function send(mail: Mail, user: string, password: string) {
  const socket = connect({ host: HOST, port: 465, servername: HOST });
  socket.setTimeout(15000, () => socket.destroy(new Error("Délai dépassé avec le serveur Gmail.")));
  const failure = new Promise<never>((_, reject) => socket.once("error", reject));
  const read = replies(socket);

  // Envoie une commande et vérifie le code de réponse attendu (220, 250, 334, 235, 354…).
  const step = async (command: string | null, expected: number, label: string) => {
    if (command !== null) socket.write(command + "\r\n");
    const reply = await Promise.race([read(), failure]);
    if (!reply.startsWith(String(expected))) throw new Error(`SMTP ${label} : ${reply.trim().split("\r\n").pop()}`);
  };

  const date = new Date().toUTCString().replace("GMT", "+0000");
  const message = [
    `From: ${encodeHeader(SENDER_NAME)} <${user}>`,
    `To: <${mail.to}>`,
    `Subject: ${encodeHeader(mail.subject)}`,
    `Date: ${date}`,
    `Message-ID: <${randomUUID()}@pacity>`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    // Corps encodé en base64, en lignes de 76 caractères : aucun point isolé ne peut couper le message.
    b64(mail.html).replace(/.{1,76}/g, "$&\r\n"),
  ].join("\r\n");

  try {
    await step(null, 220, "accueil");
    await step("EHLO pacity", 250, "EHLO");
    await step("AUTH LOGIN", 334, "authentification");
    await step(b64(user), 334, "identifiant");
    await step(b64(password), 235, "mot de passe");
    await step(`MAIL FROM:<${user}>`, 250, "expéditeur");
    await step(`RCPT TO:<${mail.to}>`, 250, "destinataire");
    await step("DATA", 354, "début du message");
    await step(message + "\r\n.", 250, "envoi");
    socket.write("QUIT\r\n");
  } finally {
    socket.end();
  }
}

/**
 * Envoie un e-mail sans jamais faire échouer l'action qui l'appelle : la réservation
 * ou l'annulation est déjà enregistrée en base, un e-mail manqué ne doit rien défaire.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !password) {
    console.warn("[mail] GMAIL_USER ou GMAIL_APP_PASSWORD absent : e-mail non envoyé.");
    return false;
  }
  try {
    await send(mail, user, password);
    return true;
  } catch (error) {
    console.error("[mail] Échec de l'envoi :", error instanceof Error ? error.message : error);
    return false;
  }
}
