import Link from "next/link";
import { Users, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import type { Room } from "@/lib/types";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { RoomPhoto } from "@/components/room-photo";

export const metadata = { title: "Nos salles" };

type Search = { usage?: string; places?: string; budget?: string; dispo?: string };

const places = (n: number) => `${n} pers. ou plus`;
const budget = (n: number) => `Jusqu’à ${n} crédit${n > 1 ? "s" : ""}/h`;

export default async function RoomsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSession();
  const f = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select("*").order("sort_order").returns<Room[]>();
  const rooms = data ?? [];
  const blockedRooms = rooms.filter((r) => r.unavailable_reason);
  const blocked = blockedRooms.length;

  // Options des filtres tirées des salles elles-mêmes : une nouvelle salle y apparaît d'office.
  const uniq = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
  const usages = [...new Set(rooms.map((r) => r.usage))];
  const capacities = uniq(rooms.map((r) => r.capacity)).filter((n) => n > 1);
  const prices = uniq(rooms.map((r) => r.credits_per_hour));

  const shown = rooms.filter((r) =>
    (!f.usage || r.usage === f.usage) &&
    (!f.places || capacities.some((n) => places(n) === f.places && r.capacity >= n)) &&
    (!f.budget || prices.some((n) => budget(n) === f.budget && r.credits_per_hour <= n)) &&
    (!f.dispo || (f.dispo === "Indisponible") === !!r.unavailable_reason));

  return (
    <>
      <PageHeader title="Nos salles"
        lead="Des espaces pensés pour vos appels, vos réunions et vos ateliers. Choisissez une salle pour la découvrir et la réserver." />

      <div className="mb-8 hidden gap-4 sm:grid sm:grid-cols-3">
        <StatCard label="Salles" value={rooms.length}
          hint={blocked === 0 ? "toutes réservables aujourd’hui" : `dont ${blocked} non réservable${blocked > 1 ? "s" : ""} aujourd’hui`} />
        <StatCard label="Places max" value={Math.max(0, ...rooms.map((r) => r.capacity))} />
        <StatCard label="Dès (crédits/h)" value={Math.min(...rooms.map((r) => r.credits_per_hour))} tone="accent" />
      </div>

      {/* Sur téléphone, les compteurs sont masqués : un bandeau signale les salles bloquées. */}
      {blocked > 0 && (
        <p className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger sm:hidden">
          {blocked} salle{blocked > 1 ? "s" : ""} non réservable{blocked > 1 ? "s" : ""} aujourd’hui :{" "}
          {blockedRooms.map((r) => `${r.name} (${r.unavailable_reason})`).join(", ")}.
        </p>
      )}

      <FilterBar filters={[
        { name: "usage", label: "Usage", options: usages },
        { name: "places", label: "Places", options: capacities.map(places) },
        { name: "budget", label: "Budget", options: prices.map(budget) },
        { name: "dispo", label: "Disponibilité", options: ["Réservable", "Indisponible"] },
      ]} />

      {shown.length === 0 && <EmptyState>Aucune salle ne correspond à ces filtres.</EmptyState>}

      <div className="grid gap-5 sm:grid-cols-2">
        {shown.map((room) => (
          <Link key={room.id} href={`/salles/${room.id}`}
            className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
            <div className="aspect-[16/9] overflow-hidden">
              <RoomPhoto url={room.photo_url} name={room.name} className="transition duration-300 group-hover:scale-105" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{room.name}</h2>
                  <p className="text-sm text-muted">{room.usage}</p>
                </div>
                {room.unavailable_reason && (
                  <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">Indisponible</span>
                )}
              </div>
              <div className="mt-4 flex gap-5 text-sm">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-muted" /> {room.capacity} pers.</span>
                <span className="inline-flex items-center gap-1.5"><Coins className="h-4 w-4 text-muted" /> {room.credits_per_hour} crédit{room.credits_per_hour > 1 ? "s" : ""} / heure</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
