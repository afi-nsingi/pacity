"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { memberEmail } from "@/lib/supabase/admin";
import { firstName } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { cancellationEmail } from "@/lib/emails";

export type CancelState = { status: "idle" } | { status: "error"; message: string } | { status: "done" };

export async function cancelBooking(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const bookingId = String(formData.get("booking") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim();
  if (reason === "Autre" && !detail) return { status: "error", message: "Précisez le motif pour le membre." };
  const motive = detail ? `${reason} – ${detail}` : reason;

  const supabase = await createClient();
  // Droits (gérant uniquement), remboursement unique et motif : vérifiés par la base.
  const { data: booking, error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId, p_reason: motive });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/", "layout");

  // E-mail au membre (motif + crédits rendus). Les lectures liées à la session du gérant
  // se font maintenant ; l'adresse (clé d'administration) et l'envoi, après la réponse.
  const [{ data: member }, { data: room }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", booking.member_id).single(),
    supabase.from("rooms").select("name").eq("id", booking.room_id).single(),
  ]);
  after(async () => {
    const to = await memberEmail(booking.member_id);
    if (!to) return;
    await sendMail(cancellationEmail(to, {
      firstName: firstName(member?.full_name ?? ""), roomName: room?.name ?? "",
      startsAt: booking.starts_at, endsAt: booking.ends_at, cost: booking.cost, reason: booking.cancel_reason ?? motive,
    }));
  });
  return { status: "done" };
}
