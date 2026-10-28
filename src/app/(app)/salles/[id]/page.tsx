import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, Coins, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { BOOKING_HORIZON_DAYS, formatDate, formatSlot } from "@/lib/dates";
import type { Booking, Room } from "@/lib/types";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { RoomPhoto } from "@/components/room-photo";
import { AvailabilityPanel } from "./availability-panel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select("name").eq("id", id).maybeSingle<{ name: string }>();
  return { title: data?.name ?? "Salle introuvable" };
}

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireSession();
  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("*").eq("id", id).maybeSingle<Room>();
  if (!room) notFound();

  const isManager = profile.role === "manager";
  const now = new Date();
  const horizon = new Date(now.getTime() + BOOKING_HORIZON_DAYS * 86400000);
  // Gérant : réservations confirmées à venir, signalées avant de bloquer la salle.
  const upcoming = isManager
    ? (await supabase.from("bookings").select("id", { count: "exact", head: true })
        .eq("room_id", room.id).eq("status", "confirmed").gt("ends_at", now.toISOString())).count ?? 0
    : 0;

  return (
    <>
      <Link href="/salles" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Toutes les salles
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="card overflow-hidden">
          <div className="aspect-[16/9]"><RoomPhoto url={room.photo_url} name={room.name} /></div>
        </div>
        <div>
          <h1 className="page-title">{room.name}</h1>
          <p className="mt-1 text-muted">{room.usage}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 ring-1 ring-line"><Users className="h-4 w-4" /> {room.capacity} personne{room.capacity > 1 ? "s" : ""}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent-dark"><Coins className="h-4 w-4" /> {room.credits_per_hour} crédit{room.credits_per_hour > 1 ? "s" : ""} / heure</span>
          </div>
          <p className="mt-5 leading-relaxed">{room.description}</p>
          {room.unavailable_reason && (
            <p className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              Salle momentanément indisponible : {room.unavailable_reason}
            </p>
          )}
          {isManager && <AvailabilityPanel roomId={room.id} reason={room.unavailable_reason} upcoming={upcoming} />}
          {!isManager && !room.unavailable_reason && (
            <Link href={`/reserver?salle=${room.id}`} className="btn-primary mt-6">
              <CalendarPlus className="h-4 w-4" /> Réserver cette salle
            </Link>
          )}
        </div>
      </div>

      {isManager ? <ManagerHistory roomId={room.id} /> : <BusySlots roomId={room.id} from={now} to={horizon} />}
    </>
  );
}

/** Membres : créneaux déjà réservés, sans le nom des autres membres. */
async function BusySlots({ roomId, from, to }: { roomId: string; from: Date; to: Date }) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("room_busy_slots", {
    p_room_id: roomId, p_from: from.toISOString(), p_to: to.toISOString(),
  });
  const slots = (data ?? []) as { starts_at: string; ends_at: string }[];
  return (
    <>
      <SectionTitle title="Créneaux déjà réservés" lead="Tous les autres créneaux (08:00–20:00, du lundi au vendredi) sont à vous." />
      {slots.length === 0 ? (
        <EmptyState>Bonne nouvelle : aucun créneau n’est pris, cette salle est libre sur toutes les heures d’ouverture.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table !min-w-0">
            <thead><tr><th>Date</th><th>Créneau</th></tr></thead>
            <tbody>
              {slots.map((s) => (
                <tr key={s.starts_at}><td>{formatDate(s.starts_at)}</td><td className="tabular-nums">{formatSlot(s.starts_at, s.ends_at)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Gérant : historique complet de la salle, avec le nom des membres. */
async function ManagerHistory({ roomId }: { roomId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("bookings")
    .select("id, starts_at, ends_at, cost, status, cancel_reason, profiles!bookings_member_id_fkey(full_name)")
    .eq("room_id", roomId).order("starts_at", { ascending: false }).limit(50)
    .returns<Booking[]>();
  const rows = data ?? [];
  return (
    <>
      <SectionTitle title="Réservations effectuées" lead="Toutes les réservations de cette salle, des plus récentes aux plus anciennes." />
      {rows.length === 0 ? <EmptyState>Aucune réservation pour cette salle.</EmptyState> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Créneau</th><th>Membre</th><th>Statut</th><th>Crédits</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>{formatDate(b.starts_at)}</td>
                  <td className="tabular-nums">{formatSlot(b.starts_at, b.ends_at)}</td>
                  <td className="font-medium">{b.profiles?.full_name}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="tabular-nums">{b.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
