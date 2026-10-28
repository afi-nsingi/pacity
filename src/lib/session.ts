import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export type Session = { profile: Profile; email: string; balance: number };

/** Utilisateur connecté + profil + solde (une seule lecture par requête). */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id, full_name, role, plan, status").eq("id", user.id).single();
  // Membre résilié : traité comme déconnecté, même si une ancienne session traîne encore.
  if (!profile || profile.status === "cancelled") return null;
  const { data: bal } = await supabase.from("member_balances").select("balance").eq("member_id", user.id).maybeSingle();
  return { profile: profile as Profile, email: user.email ?? "", balance: bal?.balance ?? 0 };
});

/** Exige une session (et un rôle) ; sinon renvoie vers la connexion ou « Accès refusé ». */
export async function requireSession(role?: Role): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (role && session.profile.role !== role) redirect("/acces-refuse");
  return session;
}

export const firstName = (fullName: string) => fullName.split(" ")[0];
