import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { bookingPeriod, formatDate, formatSlot } from "@/lib/dates";
import type { Booking } from "@/lib/types";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { CancelButton } from "./cancel-button";

export const metadata = { title: "Toutes les réservations" };

const PERIODS = ["Aujourd’hui", "Demain", "Dans les 7 jours", "Plus tard", "Passée"];
type Search = { q?: string; membre?: string; salle?: string; periode?: string; statut?: string };

export default async function AllBookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSession("manager");
  const f = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: memberRows }, { data: roomRows }] = await Promise.all([
    supabase.from("bookings")
      .select("id, starts_at, ends_at, cost, status, cancel_reason, rooms(name), profiles!bookings_member_id_fkey(full_name)")
      .order("starts_at", { ascending: false })
      .returns<Booking[]>(),
    // Options des filtres lues dans les tables : un nouveau membre ou une nouvelle salle y apparaît d'office.
    supabase.from("profiles").select("full_name").eq("role", "member").order("full_name"),
    supabase.from("rooms").select("name").order("sort_order"),
  ]);
  const all = data ?? [];
  const members = (memberRows ?? []).map((m) => m.full_name);
  const rooms = (roomRows ?? []).map((r) => r.name);
  const q = f.q?.toLowerCase().trim();

  const rows = all.filter((b) =>
    (!f.membre || b.profiles?.full_name === f.membre) &&
    (!f.salle || b.rooms?.name === f.salle) &&
    (!f.periode || bookingPeriod(b.starts_at) === f.periode) &&
    (!f.statut || (f.statut === "Confirmée") === (b.status === "confirmed")) &&
    (!q || `${b.profiles?.full_name} ${b.rooms?.name} ${b.cancel_reason ?? ""}`.toLowerCase().includes(q)));

  return (
    <>
      <PageHeader title="Toutes les réservations"
        lead="Chaque réservation de vos membres, au même endroit. Filtrez par membre, salle ou période. Besoin d’annuler ? Cliquez sur « Annuler ✖ » : le motif est demandé et les crédits sont rendus au membre." />

      <FilterBar searchPlaceholder="Rechercher une réservation" filters={[
        { name: "membre", label: "Membre", options: members },
        { name: "salle", label: "Salle", options: rooms },
        { name: "periode", label: "Période", options: PERIODS },
        { name: "statut", label: "Statut", options: ["Confirmée", "Annulée"] },
      ]} />

      {rows.length === 0 ? (
        <EmptyState>{all.length === 0
          ? "Aucune réservation pour l’instant : elles apparaîtront ici dès qu’un membre réservera une salle."
          : "Aucune réservation ne correspond à ces filtres."}</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table min-w-[820px]">
            <thead><tr><th>Date</th><th>Créneau</th><th>Membre</th><th>Salle</th><th>Statut</th><th>Action</th><th>Crédits</th><th>Motif</th></tr></thead>
            <tbody>
              {rows.map((b) => {
                const canCancel = b.status === "confirmed" && new Date(b.ends_at) > new Date();
                return (
                  <tr key={b.id}>
                    <td>{formatDate(b.starts_at)}</td>
                    <td className="tabular-nums">{formatSlot(b.starts_at, b.ends_at)}</td>
                    <td className="font-medium">{b.profiles?.full_name}</td>
                    <td>{b.rooms?.name}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{canCancel && <CancelButton bookingId={b.id}
                      summary={`${b.profiles?.full_name} · ${b.rooms?.name} · ${formatDate(b.starts_at)} ${formatSlot(b.starts_at, b.ends_at)}`} />}</td>
                    <td className="tabular-nums">{b.cost}</td>
                    <td className="max-w-xs text-muted">{b.cancel_reason ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
