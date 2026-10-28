"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { passwordProblem } from "@/lib/password";

export type PasswordState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; at: number };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const problem = passwordProblem(next, confirm);
  if (problem) return { status: "error", message: problem };
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
