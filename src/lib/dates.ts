// Toutes les dates s'affichent et se saisissent en heure de Paris,
// quel que soit le fuseau du navigateur ou du serveur.
export const TZ = "Europe/Paris";
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 20;
export const BOOKING_HORIZON_DAYS = 30;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
/** « Vendredi 30 octobre » : majuscule au jour seulement (le mois reste en minuscule en français). */
export const formatLongDate = (iso: string) => {
  const s = longFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const formatSlot = (start: string, end: string) => `${formatTime(start)} – ${formatTime(end)}`;

/** Décalage (en minutes) de Paris par rapport à UTC à un instant donné. */
function parisOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Convertit une date (AAAA-MM-JJ) et une heure de Paris en instant UTC (ISO). */
export function parisToIso(date: string, hour: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hour));
  const offset = parisOffsetMinutes(guess);
  return new Date(guess.getTime() - offset * 60000).toISOString();
}

/** Date du jour à Paris, au format AAAA-MM-JJ. */
export function parisToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Libellé de période, comme le champ « Période » de la version Softr. */
export function bookingPeriod(startIso: string): "Passée" | "Aujourd’hui" | "Demain" | "Dans les 7 jours" | "Plus tard" {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(startIso));
  const today = parisToday();
  if (new Date(startIso) < new Date()) return "Passée";
  if (day === today) return "Aujourd’hui";
  if (day === addDays(today, 1)) return "Demain";
  if (day <= addDays(today, 7)) return "Dans les 7 jours";
  return "Plus tard";
}

/** Période d'un mouvement de crédits (historique). */
export function ledgerPeriod(iso: string): "Aujourd’hui" | "7 derniers jours" | "Ce mois-ci" | "Plus ancien" {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
  const today = parisToday();
  if (day === today) return "Aujourd’hui";
  if (day >= addDays(today, -7)) return "7 derniers jours";
  if (day.slice(0, 7) === today.slice(0, 7)) return "Ce mois-ci";
  return "Plus ancien";
}

export const SLOT_HOURS = Array.from({ length: CLOSING_HOUR - OPENING_HOUR }, (_, i) => OPENING_HOUR + i);
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
