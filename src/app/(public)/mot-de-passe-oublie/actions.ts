"use server";

import { after } from "next/server";
import { passwordLink, trustedOrigin } from "@/lib/site";
import { sendMail } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/emails";

export type ForgotState = { status: "idle" } | { status: "error"; message: string } | { status: "sent" };

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Saisissez une adresse e-mail valide." };

  const origin = await trustedOrigin();
  if (!origin) return { status: "error", message: "La réinitialisation n’est pas disponible pour le moment." };

  // Tout le travail se fait après la réponse : la page répond pareil et aussi vite,
  // que l'adresse corresponde à un compte ou non (on ne révèle pas qui est inscrit).
  after(async () => {
    const link = await passwordLink(origin, email);
    if (!link) return; // adresse inconnue : rien n'est envoyé
    await sendMail(passwordResetEmail(email, link));
  });
  return { status: "sent" };
}
