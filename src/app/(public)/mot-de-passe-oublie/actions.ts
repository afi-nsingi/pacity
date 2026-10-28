"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/emails";

export type ForgotState = { status: "idle" } | { status: "error"; message: string } | { status: "sent" };

export async function requestPasswordReset(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Saisissez une adresse e-mail valide." };

  // Adresse du lien : jamais tirée de l'en-tête Host, qu'un attaquant peut falsifier pour
  // recevoir le jeton sur son propre site. En ligne : NEXT_PUBLIC_SITE_URL ; en local : localhost seulement.
  const host = (await headers()).get("host") ?? "";
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ?? (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : null);
  if (!origin) return { status: "error", message: "La réinitialisation n’est pas disponible pour le moment." };

  // Tout le travail se fait après la réponse : la page répond pareil et aussi vite,
  // que l'adresse corresponde à un compte ou non (on ne révèle pas qui est inscrit).
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
    if (error || !data.properties?.hashed_token) return; // adresse inconnue : rien n'est envoyé
    const link = `${origin}/reinitialiser?jeton=${encodeURIComponent(data.properties.hashed_token)}`;
    await sendMail(passwordResetEmail(email, link));
  });
  return { status: "sent" };
}
