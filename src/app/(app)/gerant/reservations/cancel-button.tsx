"use client";

import { useActionState, useEffect, useState } from "react";
import { submitWithoutReset } from "@/lib/forms";
import { X } from "lucide-react";
import { cancelBooking, type CancelState } from "./actions";

const REASONS = [
  "Salle indisponible (maintenance ou imprévu)",
  "Événement interne",
  "Demande du membre",
  "Réservation en double ou erreur",
  "Autre",
];

/** « Annuler ✖ » : demande le motif (obligatoire si « Autre »), puis rembourse le membre. */
export function CancelButton({ bookingId, summary }: { bookingId: string; summary: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelBooking, { status: "idle" });

  useEffect(() => { if (state.status === "done") setOpen(false); }, [state]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger-soft">
        Annuler <X className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submitWithoutReset(action)} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md space-y-4 p-6 shadow-2xl">
            <input type="hidden" name="booking" value={bookingId} />
            <div>
              <h2 className="text-lg font-bold">Pourquoi annuler ?</h2>
              <p className="mt-1 text-sm text-muted">{summary}. Les crédits seront rendus au membre et le motif affiché dans ses réservations.</p>
            </div>
            <div>
              <label className="label" htmlFor="reason">Motif</label>
              <select id="reason" name="reason" className="field" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="detail">Précision {reason === "Autre" ? "(obligatoire)" : "(facultative)"}</label>
              <textarea id="detail" name="detail" rows={2} className="field" required={reason === "Autre"}
                placeholder="Un mot pour le membre…" />
            </div>
            {state.status === "error" && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.message}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Garder la réservation</button>
              <button type="submit" disabled={pending} className="btn bg-danger text-white hover:bg-danger/90">
                {pending ? "Annulation…" : "Annuler et rembourser"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
