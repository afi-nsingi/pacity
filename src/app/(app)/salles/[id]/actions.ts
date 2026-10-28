"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

export type AvailabilityState = { status: "idle" } | { status: "error"; message: string } | { status: "done" };

/** Rend une salle indisponible (avec un motif) ou de nouveau réservable. Gérant uniquement. */
export async function setRoomAvailability(_prev: AvailabilityState, formData: FormData): Promise<AvailabilityState> {
  const session = await getSession();
  if (session?.profile.role !== "manager") return { status: "error", message: "Seul le gérant peut modifier la disponibilité d’une salle." };

  const roomId = String(formData.get("room") ?? "");
  const block = formData.get("mode") === "bloquer";
  const reason = String(formData.get("reason") ?? "");
  const detail = String(formData.get("detail") ?? "").trim();
  if (block && !reason) return { status: "error", message: "Choisissez un motif." };
  if (block && reason === "Autre" && !detail) return { status: "error", message: "Précisez le motif pour les membres." };
  const motive = !block ? null : detail ? `${reason} – ${detail}` : reason;

  const supabase = await createClient();
  // La politique RLS « salles : modification par le gérant » refuse aussi tout autre compte.
  const { data, error } = await supabase.from("rooms").update({ unavailable_reason: motive }).eq("id", roomId).select("id");
  if (error || !data?.length) return { status: "error", message: "La salle n’a pas pu être mise à jour." };

  revalidatePath("/", "layout");
  return { status: "done" };
}
