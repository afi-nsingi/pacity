import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Adresse publique de l'appli pour les liens envoyés par e-mail. Jamais tirée de l'en-tête
 * Host, qu'un attaquant peut falsifier pour recevoir un jeton sur son propre site :
 * NEXT_PUBLIC_SITE_URL en ligne, localhost seulement en local, sinon null.
 */
export async function trustedOrigin(): Promise<string | null> {
  const host = (await headers()).get("host") ?? "";
  return process.env.NEXT_PUBLIC_SITE_URL
    ?? (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : null);
}

/** Lien à usage unique (1 h) vers la page « Choisissez un nouveau mot de passe ». */
export async function passwordLink(origin: string, email: string, extra = ""): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) return null;
  return `${origin}/reinitialiser?jeton=${encodeURIComponent(data.properties.hashed_token)}${extra}`;
}
