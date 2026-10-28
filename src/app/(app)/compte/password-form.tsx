"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitWithoutReset } from "@/lib/forms";
import { PasswordInput } from "@/components/password-input";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, { status: "idle" });
  return (
    // Après un succès, la clé change : le formulaire est recréé et les champs se vident.
    <form key={state.status === "done" ? state.at : "form"} onSubmit={submitWithoutReset(action)} className="card max-w-xl space-y-4 p-6">
      <div>
        <h2 className="text-lg font-bold">Changer mon mot de passe</h2>
        <p className="mt-1 text-sm text-muted">Au moins 10 caractères, avec des lettres et au moins un chiffre.</p>
      </div>
      <div>
        <label htmlFor="current" className="label">Mot de passe actuel</label>
        <PasswordInput id="current" name="current" autoComplete="current-password" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="next" className="label">Nouveau mot de passe</label>
          <PasswordInput id="next" name="next" autoComplete="new-password" required minLength={10} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirmez-le</label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={10} />
        </div>
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>
      )}
      {state.status === "done" && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-sage-soft px-3 py-2 text-sm text-sage">
          <CheckCircle2 className="h-4 w-4" /> Mot de passe changé ✅ Utilisez-le à votre prochaine connexion.
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Enregistrement…" : "Changer mon mot de passe"}
      </button>
    </form>
  );
}
