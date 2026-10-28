"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("suite") ?? "/");
  if (!email || !password) return { error: "Saisissez votre adresse e-mail et votre mot de passe." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "user_banned") return { error: "Votre abonnement est résilié : rapprochez-vous de l’équipe Pacity pour le réactiver." };
  if (error) return { error: "Adresse e-mail ou mot de passe incorrect." };

  // On n'accepte que les redirections internes à l'application.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  // « local » : déconnecte cet appareil seulement. Par défaut, Supabase fermerait les sessions
  // du compte sur tous les appareils (téléphone, ordinateur…).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
