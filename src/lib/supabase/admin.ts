import { createClient } from "@supabase/supabase-js";

/**
 * Client d'administration (clé secrète), utilisé uniquement côté serveur pour lire
 * l'adresse e-mail d'un membre, que les tables publiques ne contiennent pas.
 * Renvoie null si la clé n'est pas configurée : l'application fonctionne sans.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function memberEmail(memberId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.auth.admin.getUserById(memberId);
  return data.user?.email ?? null;
}
