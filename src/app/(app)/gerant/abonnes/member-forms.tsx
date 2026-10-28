"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RotateCcw, UserMinus, UserPlus } from "lucide-react";
import { submitWithoutReset } from "@/lib/forms";
import { cancelMember, changePlan, createMember, reactivateMember, type MemberState } from "./actions";

const PLAN_OPTIONS = [
  { value: "full_time", label: "Full Time · 20 crédits par mois" },
  { value: "nomad", label: "Nomad · sans réservation de salle" },
];

function Feedback({ state }: { state: MemberState }) {
  if (state.status === "error") return <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>;
  if (state.status === "done") {
    return <p role="status" className="flex items-start gap-2 rounded-xl bg-sage-soft px-3 py-2 text-sm text-sage"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.message}</p>;
  }
  return null;
}

/** « Ajouter un membre » : nom, e-mail, abonnement ; le membre choisit son mot de passe via l'e-mail de bienvenue. */
export function AddMemberPanel() {
  const [state, action, pending] = useActionState<MemberState, FormData>(createMember, { status: "idle" });
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mb-6 space-y-3">
        {state.status === "done" && <Feedback state={state} />}
        <button type="button" onClick={() => setOpen(true)} className="btn-primary"><UserPlus className="h-4 w-4" /> Ajouter un membre</button>
      </div>
    );
  }

  return (
    // Après un ajout réussi, la clé change : le formulaire se vide pour un éventuel membre suivant.
    <form key={state.status === "done" ? state.at : "nouveau"} onSubmit={submitWithoutReset(action)} className="card mb-6 max-w-2xl space-y-4 p-6">
      <div>
        <p className="text-lg font-bold">Ajouter un membre</p>
        <p className="mt-1 text-sm text-muted">Il reçoit un e-mail de bienvenue pour choisir lui-même son mot de passe : personne d’autre ne le connaît.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="label">Nom complet</label>
          <input id="name" name="name" required minLength={2} className="field" placeholder="Ex. : Nina Dupont" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="new-email" className="label">Adresse e-mail</label>
          <input id="new-email" name="email" type="email" required className="field" placeholder="nina@exemple.fr" autoComplete="off" />
        </div>
      </div>
      <div>
        <label htmlFor="plan" className="label">Abonnement</label>
        <select id="plan" name="plan" className="field" defaultValue="full_time">
          {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <p className="mt-1.5 text-xs text-muted">Full Time : les 20 crédits du mois en cours sont crédités tout de suite.</p>
      </div>
      <Feedback state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Création…" : "Créer le compte"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Fermer</button>
      </div>
    </form>
  );
}

/** Abonnement d'un membre, modifiable par le gérant. */
export function PlanEditor({ memberId, plan, upcoming }: { memberId: string; plan: "full_time" | "nomad"; upcoming: number }) {
  const [state, action, pending] = useActionState<MemberState, FormData>(changePlan, { status: "idle" });
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(plan);
  const badge = plan === "full_time" ? "bg-sage-soft text-sage" : "bg-mustard-soft text-[#9a6a0c]";

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{plan === "full_time" ? "Full Time" : "Nomad"}</span>
        <button type="button" onClick={() => { setChoice(plan); setEditing(true); }} className="text-xs font-semibold text-accent hover:underline">Modifier</button>
        {pending && <span className="text-xs text-muted">Enregistrement…</span>}
        {!pending && state.status === "done" && <span className="text-xs text-sage">Enregistré ✅</span>}
        {!pending && state.status === "error" && <span role="alert" className="text-xs text-danger">{state.message}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { submitWithoutReset(action)(e); setEditing(false); }} className="min-w-56 space-y-2">
      <input type="hidden" name="member" value={memberId} />
      <select name="plan" value={choice} onChange={(e) => setChoice(e.target.value as typeof plan)} className="field !py-1.5 text-sm">
        <option value="full_time">Full Time</option>
        <option value="nomad">Nomad</option>
      </select>
      {choice === "full_time" && plan === "nomad" && <p className="text-xs text-muted">+20 crédits pour ce mois-ci, tout de suite.</p>}
      {choice === "nomad" && plan === "full_time" && (
        <p className="text-xs text-muted">
          Ses crédits restent sur son compte mais il ne pourra plus réserver.
          {upcoming > 0 && ` ${upcoming} réservation${upcoming > 1 ? "s" : ""} confirmée${upcoming > 1 ? "s" : ""} reste${upcoming > 1 ? "nt" : ""} maintenue${upcoming > 1 ? "s" : ""}.`}
        </p>
      )}
      <Feedback state={state} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending || choice === plan} className="btn-primary !px-3 !py-1.5 text-sm">{pending ? "…" : "Enregistrer"}</button>
        <button type="button" onClick={() => setEditing(false)} className="btn-ghost !px-3 !py-1.5 text-sm">Annuler</button>
      </div>
    </form>
  );
}

const CANCEL_REASONS = ["Départ du coworking", "Impayé", "Demande du membre", "Autre"];

/** Résilier : motif obligatoire ; annule et rembourse les réservations à venir, bloque la connexion. */
export function CancelMembershipPanel({ memberId, upcoming }: { memberId: string; upcoming: number }) {
  const [state, action, pending] = useActionState<MemberState, FormData>(cancelMember, { status: "idle" });
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [detail, setDetail] = useState("");

  if (!open) {
    return (
      <div className="space-y-3">
        <Feedback state={state} />
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost"><UserMinus className="h-4 w-4" /> Résilier l’abonnement</button>
      </div>
    );
  }
  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-4 border-danger/30 p-5">
      <input type="hidden" name="member" value={memberId} />
      <input type="hidden" name="reason" value={detail.trim() ? `${reason} – ${detail.trim()}` : reason} />
      <div>
        <p className="font-semibold">Résilier l’abonnement</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Le membre ne pourra plus se connecter (réversible : « Réactiver »).</li>
          <li>{upcoming > 0 ? `${upcoming} réservation${upcoming > 1 ? "s" : ""} à venir ${upcoming > 1 ? "seront annulées" : "sera annulée"} et remboursée${upcoming > 1 ? "s" : ""}.` : "Aucune réservation à venir à annuler."}</li>
          <li>Ses crédits restent sur son compte, gelés ; plus aucun renouvellement.</li>
        </ul>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cancel-reason" className="label">Motif</label>
          <select id="cancel-reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
            {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="cancel-detail" className="label">Précision {reason === "Autre" ? "(obligatoire)" : "(facultative)"}</label>
          <input id="cancel-detail" className="field" value={detail} onChange={(e) => setDetail(e.target.value)} required={reason === "Autre"} />
        </div>
      </div>
      <Feedback state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary !bg-danger">{pending ? "Résiliation…" : "Confirmer la résiliation"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Annuler</button>
      </div>
    </form>
  );
}

/** Réactiver un membre résilié, avec l'abonnement choisi. */
export function ReactivatePanel({ memberId, lastPlan }: { memberId: string; lastPlan: "full_time" | "nomad" | null }) {
  const [state, action, pending] = useActionState<MemberState, FormData>(reactivateMember, { status: "idle" });
  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-3 p-5">
      <input type="hidden" name="member" value={memberId} />
      <p className="font-semibold">Réactiver l’abonnement</p>
      <select name="plan" defaultValue={lastPlan ?? "full_time"} className="field">
        {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>
      <p className="text-xs text-muted">Connexion rétablie ; en Full Time, les 20 crédits du mois s’ajoutent s’il ne les a pas déjà eus.</p>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn-primary"><RotateCcw className="h-4 w-4" /> {pending ? "Réactivation…" : "Réactiver"}</button>
    </form>
  );
}
