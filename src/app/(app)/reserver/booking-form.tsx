"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { submitWithoutReset } from "@/lib/forms";
import { CheckCircle2 } from "lucide-react";
import { bookRoom, type BookState } from "./actions";
import { DatePicker } from "@/components/date-picker";
import { addDays, BOOKING_HORIZON_DAYS, CLOSING_HOUR, formatLongDate, formatSlot, hourLabel, parisToIso, SLOT_HOURS } from "@/lib/dates";

type RoomOption = { id: string; name: string; credits_per_hour: number; unavailable_reason: string | null };
type Busy = { room_id: string; starts_at: string; ends_at: string };

export function BookingForm({ rooms, busy, today, balance, initialRoom, lockRoom }: {
  rooms: RoomOption[]; busy: Busy[]; today: string; balance: number; initialRoom?: string; lockRoom?: boolean;
}) {
  const [state, action, pending] = useActionState<BookState, FormData>(bookRoom, { status: "idle" });
  const [roomId, setRoomId] = useState(initialRoom ?? rooms.find((r) => !r.unavailable_reason)?.id ?? "");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [hours, setHours] = useState(1);

  const room = rooms.find((r) => r.id === roomId);
  const cost = (room?.credits_per_hour ?? 0) * hours;
  const blocked = room?.unavailable_reason ?? null;

  // Disponibilités en direct : un créneau est grisé s'il chevauche une réservation confirmée.
  const taken = useMemo(() => {
    if (!date || !roomId) return new Set<number>();
    const set = new Set<number>();
    for (const h of SLOT_HOURS) {
      const start = new Date(parisToIso(date, h)).getTime();
      const end = start + 3600000;
      if (busy.some((b) => b.room_id === roomId && new Date(b.starts_at).getTime() < end && new Date(b.ends_at).getTime() > start)) set.add(h);
    }
    return set;
  }, [busy, date, roomId]);

  const isPast = (h: number) => date === today && new Date(parisToIso(date, h)) < new Date();
  const fits = (h: number) =>
    h + hours <= CLOSING_HOUR && Array.from({ length: hours }, (_, i) => h + i).every((x) => !taken.has(x));

  if (state.status === "success") {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-sage" />
        <h2 className="mt-4 text-2xl font-bold">C’est réservé ✅</h2>
        <p className="mt-2 text-muted">
          {state.roomName} · {formatLongDate(state.startsAt)} · {formatSlot(state.startsAt, state.endsAt)}
        </p>
        <p className="mt-1 text-sm text-muted">{state.cost} crédit{state.cost > 1 ? "s" : ""} débité{state.cost > 1 ? "s" : ""} de votre solde.</p>
        <p className="mt-1 text-sm text-muted">Un empêchement ? Prévenez l’équipe Pacity : elle annulera la réservation et vos crédits vous seront rendus.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/mes-reservations" className="btn-primary">Voir mes réservations</Link>
          <a href="/reserver" className="btn-ghost">Réserver un autre créneau</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submitWithoutReset(action)} className="card space-y-6 p-6">
      <input type="hidden" name="room" value={roomId} />
      <input type="hidden" name="hour" value={hour ?? ""} />

      {!lockRoom && (
        <div>
          <label className="label" htmlFor="room-select">Salle</label>
          <select id="room-select" className="field" value={roomId} onChange={(e) => { setRoomId(e.target.value); setHour(null); }}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} disabled={!!r.unavailable_reason}>
                {r.name} · {r.credits_per_hour} crédit{r.credits_per_hour > 1 ? "s" : ""}/h{r.unavailable_reason ? " (indisponible)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {blocked && (
        <p role="status" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {room?.name} est momentanément indisponible : {blocked}. Choisissez une autre salle.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Date</label>
          <input type="hidden" name="date" value={date} />
          <DatePicker id="date" value={date} min={today} max={addDays(today, BOOKING_HORIZON_DAYS)}
            onChange={(d) => { setDate(d); setHour(null); }} />
        </div>
        <div>
          <label className="label" htmlFor="hours">Durée</label>
          <select id="hours" name="hours" className="field" value={hours} onChange={(e) => { setHours(Number(e.target.value)); setHour(null); }}>
            {[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} heure{h > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>

      <div>
        <p className="label">Créneau</p>
        {!date ? (
          <p className="text-sm text-muted">Choisissez d’abord un jour.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SLOT_HOURS.map((h) => {
              const disabled = !fits(h) || isPast(h);
              const selected = hour === h;
              return (
                <button key={h} type="button" disabled={disabled} onClick={() => setHour(h)}
                  title={taken.has(h) ? "Déjà réservé" : undefined}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium tabular-nums transition ${
                    selected ? "border-accent bg-accent text-white"
                      : disabled ? "cursor-not-allowed border-line bg-cream text-muted/50 line-through"
                      : "border-line bg-surface hover:border-accent hover:text-accent"}`}>
                  {hourLabel(h)}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Les créneaux barrés sont déjà pris ou passés.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Coût : <strong className="text-accent-dark">{cost} crédit{cost > 1 ? "s" : ""}</strong>
          <span className="text-muted"> · votre solde : {balance} crédit{balance > 1 ? "s" : ""}</span>
        </p>
        <button type="submit" className="btn-primary" disabled={pending || hour === null || !roomId || !!blocked}>
          {pending ? "Réservation…" : "Réserver ce créneau"}
        </button>
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{state.message}</p>
      )}
    </form>
  );
}
