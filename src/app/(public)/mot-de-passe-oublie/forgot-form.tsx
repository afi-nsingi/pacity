"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { submitWithoutReset } from "@/lib/forms";
import { requestPasswordReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestPasswordReset, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="card space-y-3 p-6">
        <MailCheck className="h-8 w-8 text-sage" />
        <p className="font-semibold">C’est parti 📬</p>
        <p className="text-sm text-muted">
          Si un compte Pacity correspond à cette adresse, un e-mail vient de partir avec un lien pour choisir un nouveau mot de passe.
          Pensez à regarder dans vos courriers indésirables. Le lien expire dans une heure.
        </p>
        <Link href="/login" className="btn-ghost">Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-4 p-6">
      <div>
        <label htmlFor="email" className="label">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" placeholder="vous@exemple.fr" />
      </div>
      {state.status === "error" && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Envoi…" : "Recevoir un lien"}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-muted hover:text-accent">Je m’en souviens, retour à la connexion</Link></p>
    </form>
  );
}
