"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type PasswordState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; at: number };

const MIN_LENGTH = 10;

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < MIN_LENGTH || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
    return { status: "error", message: `Choisissez au moins ${MIN_LENGTH} caractères, avec des lettres et au moins un chiffre.` };
  }
  if (next !== confirm) return { status: "error", message: "Les deux nouveaux mots de passe ne correspondent pas." };
  if (next === current) return { status: "error", message: "Le nouveau mot de passe doit être différent de l’actuel." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { status: "error", message: "Votre session a expiré : reconnectez-vous." };

  // Vérifie le mot de passe actuel avec un client à part, sans toucher à la session ouverte :
  // quelqu'un qui trouverait un ordinateur resté connecté ne peut pas changer le mot de passe.
  const checker = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await checker.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { status: "error", message: "Mot de passe actuel incorrect." };
  // « local » : ferme seulement cette session de vérification (par défaut, Supabase
  // fermerait toutes les sessions du compte, y compris celle en cours).
  await checker.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { status: "error", message: "Le mot de passe n’a pas pu être changé. Réessayez dans un instant." };
  return { status: "done", at: Date.now() };
}
