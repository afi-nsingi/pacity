"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { passwordProblem } from "@/lib/password";

export type ResetState = { status: "idle" } | { status: "error"; message: string; expired?: boolean };

export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("jeton") ?? "");
  const problem = passwordProblem(String(formData.get("next") ?? ""), String(formData.get("confirm") ?? ""));
  if (problem) return { status: "error", message: problem };

  // Le jeton n'est consommé qu'ici, à l'envoi du formulaire, et non à l'ouverture de la page :
  // les messageries qui « pré-ouvrent » les liens pour les analyser ne peuvent pas le griller.
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: token });
  if (error) return { status: "error", expired: true, message: "Ce lien a expiré ou a déjà servi." };

  const { error: updateError } = await supabase.auth.updateUser({ password: String(formData.get("next")) });
  if (updateError) return { status: "error", message: "Le mot de passe n’a pas pu être changé. Réessayez dans un instant." };
  redirect("/?motdepasse=nouveau");
}
