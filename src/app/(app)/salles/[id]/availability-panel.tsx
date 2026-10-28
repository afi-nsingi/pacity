"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Ban, CheckCircle2 } from "lucide-react";
import { submitWithoutReset } from "@/lib/forms";
import { setRoomAvailability, type AvailabilityState } from "./actions";

const REASONS = ["Travaux", "Fuite ou dégât des eaux", "Privatisation", "Maintenance du matériel", "Autre"];

/** Gérant : rendre la salle indisponible (avec un motif) ou de nouveau réservable. */
export function AvailabilityPanel({ roomId, reason, upcoming }: { roomId: string; reason: string | null; upcoming: number }) {
  const [state, action, pending] = useActionState<AvailabilityState, FormData>(setRoomAvailability, { status: "idle" });
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(REASONS[0]);

  const error = state.status === "error" && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>;

  if (reason) {
    return (
      <form onSubmit={submitWithoutReset(action)} className="mt-6 space-y-3">
        <input type="hidden" name="room" value={roomId} />
        <input type="hidden" name="mode" value="debloquer" />
        {error}
        <button type="submit" disabled={pending} className="btn-ghost">
          <CheckCircle2 className="h-4 w-4" /> {pending ? "Enregistrement…" : "Rendre la salle réservable"}
        </button>
      </form>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost mt-6">
        <Ban className="h-4 w-4" /> Rendre la salle indisponible
      </button>
    );
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="card mt-6 space-y-4 p-5">
      <input type="hidden" name="room" value={roomId} />
      <input type="hidden" name="mode" value="bloquer" />
      <div>
        <p className="font-semibold">Rendre la salle indisponible</p>
        <p className="mt-1 text-sm text-muted">Plus aucune réservation ne sera possible. Le motif s’affiche aux membres.</p>
      </div>
      <div>
        <label htmlFor="reason" className="label">Motif</label>
        <select id="reason" name="reason" className="field" value={choice} onChange={(e) => setChoice(e.target.value)}>
          {REASONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="detail" className="label">Précision {choice === "Autre" ? "(obligatoire)" : "(facultative)"}</label>
        <input id="detail" name="detail" className="field" required={choice === "Autre"} placeholder="Ex. : jusqu’au 6 novembre" />
      </div>
      {upcoming > 0 && (
        <p className="rounded-xl bg-mustard-soft px-3 py-2 text-sm text-[#7a5408]">
          {upcoming} réservation{upcoming > 1 ? "s" : ""} à venir dans cette salle {upcoming > 1 ? "restent" : "reste"} confirmée{upcoming > 1 ? "s" : ""}.
          Pour {upcoming > 1 ? "les" : "l’"}annuler et rembourser, passez par{" "}
          <Link href="/gerant/reservations?statut=Confirm%C3%A9e" className="font-semibold underline">Toutes les réservations</Link>.
        </p>
      )}
      {error}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Enregistrement…" : "Confirmer"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost">Annuler</button>
      </div>
    </form>
  );
}
