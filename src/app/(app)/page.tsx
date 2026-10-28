import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { firstName, requireSession } from "@/lib/session";
import { formatDate, formatLongDate, formatSlot, parisToday } from "@/lib/dates";
import type { Booking, Room } from "@/lib/types";
import { EmptyState, SectionTitle, StatCard, WelcomeBanner } from "@/components/ui";

export const metadata = { title: "Accueil" };

export default async function HomePage() {
  const session = await requireSession();
  const today = formatLongDate(new Date().toISOString());
  return session.profile.role === "manager"
    ? <ManagerHome name={firstName(session.profile.full_name)} today={today} />
    : <MemberHome name={firstName(session.profile.full_name)} today={today} balance={session.balance} plan={session.profile.plan} />;
}

async function MemberHome({ name, today, balance, plan }: { name: string; today: string; balance: number; plan: string | null }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, cost, status, rooms(name)")
    .eq("status", "confirmed")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .returns<Booking[]>();
  const upcoming = data ?? [];
  const month = parisToday().slice(0, 7);
  const monthOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(iso)).slice(0, 7);
  const thisMonth = upcoming.filter((b) => monthOf(b.starts_at) === month).length;

  return (
    <>
      <WelcomeBanner date={today} title={`Bonjour ${name} 👋`}
        text="Une réunion, un appel, un moment de concentration ? Réservez votre salle en quelques clics." />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Mon solde" value={balance} hint="crédits disponibles" tone="accent" />
        <StatCard label="À venir" value={upcoming.length} hint="réservations confirmées" tone="sage" />
        <StatCard label="Ce mois-ci" value={thisMonth} hint="réservations à venir ce mois" />
      </div>

      {plan === "nomad" && (
        <p className="mt-6 rounded-2xl bg-mustard-soft px-5 py-4 text-sm text-[#7a5408]">
          Votre abonnement Nomad ne comprend pas de réservation de salle. Pour réserver, rapprochez-vous de l’équipe Pacity afin de passer en Full Time.
        </p>
      )}

      <SectionTitle title="Mes réservations à venir" lead="Vos prochains créneaux confirmés." />
      {upcoming.length === 0 ? (
        <EmptyState>
          Aucune réservation à venir pour l’instant.{" "}
          <Link href="/reserver" className="font-semibold text-accent hover:underline">Réservez votre salle en quelques clics.</Link>
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.slice(0, 6).map((b) => (
            <div key={b.id} className="card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{b.rooms?.name}</p>
                <p className="text-sm text-muted">{formatDate(b.starts_at)} · {formatSlot(b.starts_at, b.ends_at)}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-dark">−{b.cost} crédits</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/reserver" className="btn-primary"><CalendarPlus className="h-4 w-4" /> Réserver une salle</Link>
        <Link href="/salles" className="btn-ghost">Découvrir nos salles</Link>
      </div>
    </>
  );
}

async function ManagerHome({ name, today }: { name: string; today: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: rooms }, { data: bookings }] = await Promise.all([
    supabase.from("rooms").select("id, name, unavailable_reason").order("sort_order").returns<Room[]>(),
    supabase.from("bookings")
      .select("id, starts_at, ends_at, cost, status, room_id, rooms(name), profiles!bookings_member_id_fkey(full_name)")
      .eq("status", "confirmed").gte("ends_at", now).order("starts_at")
      .returns<Booking[]>(),
  ]);
  const upcoming = bookings ?? [];
  const todayIso = parisToday();
  const todayCount = upcoming.filter((b) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(b.starts_at)) === todayIso).length;
  const available = (rooms ?? []).filter((r) => !r.unavailable_reason).length;
  const perRoom = (rooms ?? []).map((r) => ({ name: r.name, count: upcoming.filter((b) => b.room_id === r.id).length }));
  const max = Math.max(1, ...perRoom.map((r) => r.count));

  return (
    <>
      <WelcomeBanner date={today} title={`Bonjour ${name} 👋`}
        text="Voici l’activité du coworking : suivez et gérez toutes les réservations en un coup d’œil." />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Salles réservables" value={`${available} / ${rooms?.length ?? 0}`} hint="aujourd’hui" />
        <StatCard label="Réservations aujourd’hui" value={todayCount} tone="accent" />
        <StatCard label="Réservations à venir" value={upcoming.length} tone="sage" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <SectionTitle title="Réservations à venir" lead="Les prochains créneaux confirmés, tous membres confondus." />
          {upcoming.length === 0 ? (
            <EmptyState>Aucune réservation à venir : tout est à jour ✨</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Créneau</th><th>Membre</th><th>Salle</th></tr></thead>
                <tbody>
                  {upcoming.slice(0, 8).map((b) => (
                    <tr key={b.id}>
                      <td>{formatDate(b.starts_at)}</td>
                      <td className="tabular-nums">{formatSlot(b.starts_at, b.ends_at)}</td>
                      <td className="font-medium">{b.profiles?.full_name}</td>
                      <td>{b.rooms?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href="/gerant/reservations" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
            Voir toutes les réservations →
          </Link>
        </div>

        <div>
          <SectionTitle title="Réservations à venir par salle" />
          <div className="card space-y-4 p-5">
            {perRoom.map((r) => (
              <div key={r.name}>
                <div className="mb-1 flex justify-between text-sm"><span>{r.name}</span><span className="font-semibold">{r.count}</span></div>
                <div className="h-2.5 rounded-full bg-cream">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
