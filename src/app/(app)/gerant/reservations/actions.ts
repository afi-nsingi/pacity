"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CancelState = { status: "idle" } | { status: "error"; message: string } | { status: "done" };

export async function cancelBooking(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const bookingId = String(formData.get("booking") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim();
  if (reason === "Autre" && !detail) return { status: "error", message: "Précisez le motif pour le membre." };
  const motive = detail ? `${reason} – ${detail}` : reason;

  const supabase = await createClient();
  // Droits (gérant uniquement), remboursement unique et motif : vérifiés par la base.
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId, p_reason: motive });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/", "layout");
  return { status: "done" };
}
