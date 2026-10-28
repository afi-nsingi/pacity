import Link from "next/link";
import { Users, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import type { Room } from "@/lib/types";
import { PageHeader, StatCard } from "@/components/ui";
import { RoomPhoto } from "@/components/room-photo";

export const metadata = { title: "Nos salles" };

export default async function RoomsPage() {
  await requireSession();
  const supabase = await createClient();
  const { data } = await supabase.from("rooms").select("*").order("sort_order").returns<Room[]>();
  const rooms = data ?? [];

  return (
    <>
      <PageHeader title="Nos salles"
        lead="Des espaces pensés pour vos appels, vos réunions et vos ateliers. Choisissez une salle pour la découvrir et la réserver." />

      <div className="mb-8 hidden gap-4 sm:grid sm:grid-cols-3">
        <StatCard label="Salles" value={rooms.length} />
        <StatCard label="Places max" value={Math.max(0, ...rooms.map((r) => r.capacity))} />
        <StatCard label="Dès (crédits/h)" value={Math.min(...rooms.map((r) => r.credits_per_hour))} tone="accent" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {rooms.map((room) => (
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
