import { formatLongDate, formatSlot } from "@/lib/dates";
import type { Mail } from "@/lib/mail";

// E-mails aux membres, au ton et aux couleurs Pacity. Styles en ligne : les messageries
// (Gmail, Outlook) ignorent les feuilles de style.

type BookingInfo = { firstName: string; roomName: string; startsAt: string; endsAt: string; cost: number };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const credits = (n: number) => `${n} crédit${n > 1 ? "s" : ""}`;

type Button = { href: string; label: string } | null;

function layout(title: string, body: string, action?: Button) {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const target = action !== undefined ? action : site ? { href: `${site}/mes-reservations`, label: "Voir mes réservations" } : null;
  const button = target
    ? `<p style="margin:28px 0 0"><a href="${target.href}" style="background:#E2583E;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px;display:inline-block">${target.label}</a></p>`
    : "";
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#FFF8F0;font-family:Helvetica,Arial,sans-serif;color:#2B2118">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#E2583E">pacity.</p>
  <div style="background:#ffffff;border-radius:20px;padding:28px;border:1px solid #F1E4D6">
    <h1 style="margin:0 0 16px;font-size:22px">${title}</h1>
    ${body}
    ${button}
  </div>
  <p style="margin:20px 0 0;font-size:13px;color:#7A6A5C">À très vite chez Pacity ☕<br>L’équipe Pacity</p>
</div></body></html>`;
}

function details(b: BookingInfo, extra = "") {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#7A6A5C;width:110px">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:15px">
    ${row("Salle", escape(b.roomName))}
    ${row("Date", formatLongDate(b.startsAt))}
    ${row("Créneau", formatSlot(b.startsAt, b.endsAt))}
    ${extra}
  </table>`;
}

export function confirmationEmail(to: string, b: BookingInfo): Mail {
  return {
    to,
    subject: "Pacity · Votre réservation est confirmée ✅",
    html: layout(`C’est réservé, ${escape(b.firstName)} ✅`,
      `<p style="margin:0;line-height:1.6">Votre salle vous attend. Voici le récapitulatif :</p>
      ${details(b, `<tr><td style="padding:6px 0;color:#7A6A5C">Crédits</td><td style="padding:6px 0;font-weight:600">${credits(b.cost)} débité${b.cost > 1 ? "s" : ""}</td></tr>`)}
      <p style="margin:0;line-height:1.6;color:#7A6A5C;font-size:14px">Un empêchement ? Prévenez l’équipe Pacity : elle annulera la réservation et vos crédits vous seront rendus.</p>`),
  };
}

export function cancellationEmail(to: string, b: BookingInfo & { reason: string }): Mail {
  return {
    to,
    subject: "Pacity · Votre réservation a été annulée",
    html: layout(`Votre réservation a été annulée`,
      `<p style="margin:0;line-height:1.6">Bonjour ${escape(b.firstName)}, l’équipe Pacity a dû annuler votre réservation :</p>
      ${details(b, `<tr><td style="padding:6px 0;color:#7A6A5C">Motif</td><td style="padding:6px 0;font-weight:600">${escape(b.reason)}</td></tr>`)}
      <p style="margin:0;line-height:1.6"><strong style="color:#4E8B6E">${credits(b.cost)} vous ${b.cost > 1 ? "ont" : "a"} été rendu${b.cost > 1 ? "s" : ""}.</strong> Vous pouvez réserver un autre créneau quand vous le souhaitez.</p>`),
  };
}

export function passwordResetEmail(to: string, link: string): Mail {
  return {
    to,
    subject: "Pacity · Choisissez un nouveau mot de passe",
    html: layout("Mot de passe oublié ? Pas de souci 🔑",
      `<p style="margin:0;line-height:1.6">Vous avez demandé à réinitialiser votre mot de passe Pacity. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
      <p style="margin:16px 0 0;line-height:1.6;color:#7A6A5C;font-size:14px">Ce lien ne sert qu’une fois et expire dans une heure. Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet e-mail : votre mot de passe actuel reste valable.</p>`,
      { href: link, label: "Choisir un nouveau mot de passe" }),
  };
}

export function welcomeEmail(to: string, firstName: string, plan: "full_time" | "nomad", link: string): Mail {
  const planText = plan === "full_time"
    ? "Votre abonnement <strong>Full Time</strong> vous donne <strong>20 crédits par mois</strong>, cumulables : ceux de ce mois sont déjà sur votre compte."
    : "Votre abonnement <strong>Nomad</strong> vous donne accès au coworking ; la réservation de salles est réservée aux abonnés Full Time.";
  return {
    to,
    subject: "Bienvenue chez Pacity 👋 Votre accès aux réservations",
    html: layout(`Bienvenue chez Pacity, ${escape(firstName)} 👋`,
      `<p style="margin:0;line-height:1.6">L’équipe Pacity vous a ouvert un accès à l’application de réservation des salles de réunion.</p>
      <p style="margin:16px 0 0;line-height:1.6">${planText}</p>
      <p style="margin:16px 0 0;line-height:1.6;color:#7A6A5C;font-size:14px">Pour commencer, choisissez votre mot de passe. Ce lien ne sert qu’une fois et expire dans une heure ; passé ce délai, utilisez « Mot de passe oublié ? » sur la page de connexion.</p>`,
      { href: link, label: "Choisir mon mot de passe" }),
  };
}

export function membershipCancelledEmail(to: string, b: { firstName: string; reason: string; cancelledBookings: number; balance: number }): Mail {
  const bookings = b.cancelledBookings > 0
    ? `<li style="margin-bottom:6px">Vos ${b.cancelledBookings} réservation${b.cancelledBookings > 1 ? "s" : ""} à venir ${b.cancelledBookings > 1 ? "ont été annulées" : "a été annulée"} et vos crédits rendus.</li>`
    : "";
  return {
    to,
    subject: "Pacity · Votre abonnement a été résilié",
    html: layout(`Votre abonnement a été résilié`,
      `<p style="margin:0;line-height:1.6">Bonjour ${escape(b.firstName)}, l’équipe Pacity a résilié votre abonnement.</p>
      <p style="margin:16px 0 0;line-height:1.6"><strong>Motif :</strong> ${escape(b.reason)}</p>
      <ul style="margin:16px 0 0;padding-left:20px;line-height:1.6">
        ${bookings}
        <li style="margin-bottom:6px">Votre accès à l’application de réservation est désactivé.</li>
        <li>Vos ${credits(b.balance)} restent sur votre compte : ils seront de nouveau utilisables si vous vous réabonnez.</li>
      </ul>
      <p style="margin:16px 0 0;line-height:1.6;color:#7A6A5C;font-size:14px">Une erreur ou l’envie de revenir ? Répondez à cet e-mail ou passez nous voir : nous réactivons votre abonnement en un instant.</p>`,
      null),
  };
}

export function membershipReactivatedEmail(to: string, b: { firstName: string; plan: "full_time" | "nomad"; balance: number }): Mail {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    to,
    subject: "Pacity · Votre abonnement est réactivé 🎉",
    html: layout(`Ravis de vous revoir, ${escape(b.firstName)} 🎉`,
      `<p style="margin:0;line-height:1.6">Votre abonnement <strong>${b.plan === "full_time" ? "Full Time" : "Nomad"}</strong> est de nouveau actif et votre accès à l’application est rétabli.</p>
      <p style="margin:16px 0 0;line-height:1.6">Solde actuel : <strong>${credits(b.balance)}</strong>${b.plan === "full_time" ? " (20 crédits par mois, cumulables)." : "."}</p>
      <p style="margin:16px 0 0;line-height:1.6;color:#7A6A5C;font-size:14px">Connectez-vous avec votre mot de passe habituel. Oublié ? Utilisez « Mot de passe oublié ? » sur la page de connexion.</p>`,
      site ? { href: `${site}/login`, label: "Me connecter" } : null),
  };
}
