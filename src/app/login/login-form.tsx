"use client";

import { useActionState } from "react";
import { submitWithoutReset } from "@/lib/forms";
import { signIn, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="suite" value={next} />
      <div>
        <label htmlFor="email" className="label">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="vous@exemple.fr" />
      </div>
      <div>
        <label htmlFor="password" className="label">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" placeholder="Votre mot de passe" />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-xs text-muted">
        Mot de passe oublié ? Rapprochez-vous de l’équipe Pacity.
      </p>
    </form>
  );
}
