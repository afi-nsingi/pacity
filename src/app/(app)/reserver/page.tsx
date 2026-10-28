import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { parisToday } from "@/lib/dates";
import type { Room } from "@/lib/types";
import { PageHeader } from "@/components/ui";
import { BookingForm } from "./booking-form";

export const metadata = { title: "Réserver" };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ salle?: string }> }) {
  const { profile, balance } = await requireSession("member");
  const { salle } = await searchParams;
  const supabase = await createClient();
  const [{ data: rooms }, { data: busy }] = await Promise.all([
    supabase.from("rooms").select("id, name, credits_per_hour, unavailable_reason").order("sort_order").returns<Room[]>(),
    supabase.rpc("upcoming_busy_slots"),
  ]);
  const slots = (busy ?? []) as { room_id: string; room_name: string; starts_at: string; ends_at: string }[];
  const chosen = rooms?.find((r) => r.id === salle);

  return (
    <>
      <PageHeader title={chosen ? `Réserver la ${chosen.name}` : "Réservez votre salle"}
        lead="Choisissez une date et un créneau libre : la réservation est confirmée immédiatement et vos crédits sont débités." />

      {profile.plan === "nomad" ? (
        <p className="rounded-2xl bg-mustard-soft px-5 py-4 text-sm text-[#7a5408]">
          Votre abonnement Nomad ne comprend pas de réservation de salle. Rapprochez-vous de l’équipe Pacity pour passer en Full Time.
        </p>
      ) : (
        <BookingForm rooms={rooms ?? []} busy={slots} today={parisToday()} balance={balance}
          initialRoom={chosen?.id} lockRoom={!!chosen} />
      )}
    </>
  );
}
