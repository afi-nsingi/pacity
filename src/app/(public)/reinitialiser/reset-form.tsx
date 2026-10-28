"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitWithoutReset } from "@/lib/forms";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_HINT } from "@/lib/password";
import { resetPassword, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, { status: "idle" });
  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-4 p-6">
      <input type="hidden" name="jeton" value={token} />
      <p className="text-sm text-muted">{PASSWORD_HINT}</p>
      <div>
        <label htmlFor="next" className="label">Nouveau mot de passe</label>
        <PasswordInput id="next" name="next" autoComplete="new-password" required minLength={10} />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirmez-le</label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={10} />
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.message}{" "}
          {state.expired && <Link href="/mot-de-passe-oublie" className="font-semibold underline">Demander un nouveau lien</Link>}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Enregistrement…" : "Enregistrer et me connecter"}</button>
    </form>
  );
}
