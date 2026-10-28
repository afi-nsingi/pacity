"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, BOOKING_HORIZON_DAYS, formatLongDate } from "@/lib/dates";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

// Les dates sont des chaînes « AAAA-MM-JJ » ; on les lit à midi UTC pour éviter tout décalage de jour.
const toDate = (d: string) => new Date(`${d}T12:00:00Z`);
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;
const shiftMonth = (d: string, n: number) => {
  const x = toDate(monthStart(d));
  x.setUTCMonth(x.getUTCMonth() + n);
  return x.toISOString().slice(0, 10);
};
const isWeekend = (d: string) => [0, 6].includes(toDate(d).getUTCDay());

/** Calendrier : week-ends et jours hors de la période [min, max] grisés et non cliquables. */
export function DatePicker({ id, value, onChange, min, max }: {
  id: string; value: string; onChange: (date: string) => void; min: string; max: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthStart(value || min));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  // Grille du mois : cases vides jusqu'au premier jour (semaine commençant le lundi), puis chaque jour.
  const first = toDate(month);
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(month, i)),
  ];
  const canPrev = month > monthStart(min);
  const canNext = month < monthStart(max);

  return (
    <div ref={ref} className="relative">
      <button id={id} type="button" className="field flex items-center justify-between text-left"
        aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "text-muted"}>{value ? formatLongDate(`${value}T12:00:00Z`) : "Choisissez une date"}</span>
        <CalendarDays className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <div role="dialog" aria-label="Choisir une date"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-surface p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Mois précédent" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded-lg p-1.5 hover:bg-cream disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-sm font-semibold first-letter:uppercase">{monthFmt.format(first)}</p>
            <button type="button" aria-label="Mois suivant" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded-lg p-1.5 hover:bg-cream disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {WEEKDAYS.map((w, i) => <span key={i} className={`py-1 font-medium ${i > 4 ? "text-muted/50" : "text-muted"}`}>{w}</span>)}
            {cells.map((d, i) => {
              if (!d) return <span key={`vide-${i}`} />;
              const disabled = isWeekend(d) || d < min || d > max;
              const selected = d === value;
              return (
                <button key={d} type="button" disabled={disabled}
                  title={isWeekend(d) ? "Fermé le week-end" : undefined}
                  onClick={() => { onChange(d); setOpen(false); }}
                  className={`aspect-square rounded-lg text-sm tabular-nums transition ${
                    selected ? "bg-accent font-semibold text-white"
                      : disabled ? "cursor-not-allowed bg-cream/60 text-muted/40"
                      : "hover:bg-accent-soft hover:text-accent-dark"}`}>
                  {Number(d.slice(8))}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Week-ends fermés · réservation jusqu’à {BOOKING_HORIZON_DAYS} jours à l’avance.</p>
        </div>
      )}
    </div>
  );
}
