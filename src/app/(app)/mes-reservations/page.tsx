import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { bookingPeriod, formatDate, formatSlot } from "@/lib/dates";
import type { Booking } from "@/lib/types";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { FilterBar } from "@/components/filters";

export const metadata = { title: "Mes réservations" };

const PERIODS = ["Aujourd’hui", "Demain", "Dans les 7 jours", "Plus tard", "Passée"];
const STATUSES = ["Confirmée", "Annulée"];

type Search = { periode?: string; salle?: string; statut?: string };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { profile } = await requireSession("member");
  const filters = await searchParams;
  const supabase = await createClient();
  // La RLS ne renvoie que les réservations du membre connecté.
  const { data } = await supabase.from("bookings")
    .select("id, starts_at, ends_at, cost, status, cancel_reason, rooms(name)")
    .eq("member_id", profile.id)
    .order("starts_at", { ascending: false })
    .returns<Booking[]>();
  const all = data ?? [];
  const rooms = [...new Set(all.map((b) => b.rooms?.name ?? ""))].filter(Boolean).sort();

  const rows = all.filter((b) =>
    (!filters.periode || bookingPeriod(b.starts_at) === filters.periode) &&
    (!filters.salle || b.rooms?.name === filters.salle) &&
    (!filters.statut || (filters.statut === "Confirmée") === (b.status === "confirmed")));

  return (
    <>
      <PageHeader title="Mes réservations"
        lead="Retrouvez toutes vos réservations. Une annulation par l’équipe Pacity ? Le motif s’affiche ici et vos crédits vous sont rendus.">
        <Link href="/reserver" className="btn-primary">Réserver une salle</Link>
      </PageHeader>

      <FilterBar filters={[
        { name: "periode", label: "Période", options: PERIODS },
        { name: "salle", label: "Salle", options: rooms },
        { name: "statut", label: "Statut", options: STATUSES },
      ]} />

      {rows.length === 0 ? (
        <EmptyState>
          {all.length === 0
            ? <>Vous n’avez pas encore de réservation. <Link href="/reserver" className="font-semibold text-accent hover:underline">Réservez une salle</Link> en quelques clics.</>
            : "Aucune réservation ne correspond à ces filtres."}
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Salle</th><th>Date</th><th>Créneau</th><th>Statut</th><th>Crédits</th><th>Motif</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium">{b.rooms?.name}</td>
                  <td>{formatDate(b.starts_at)}</td>
                  <td className="tabular-nums">{formatSlot(b.starts_at, b.ends_at)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="tabular-nums">{b.status === "cancelled" ? <span className="text-sage">rendus</span> : `−${b.cost}`}</td>
                  <td className="max-w-xs text-muted">{b.cancel_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
