"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parisToIso } from "@/lib/dates";

export type BookState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; roomName: string; startsAt: string; endsAt: string; cost: number };

export async function bookRoom(_prev: BookState, formData: FormData): Promise<BookState> {
  const roomId = String(formData.get("room") ?? "");
  const date = String(formData.get("date") ?? "");
  const hour = Number(formData.get("hour"));
  const hours = Number(formData.get("hours") ?? 1);
  if (!roomId || !date || !Number.isInteger(hour)) {
    return { status: "error", message: "Choisissez une salle, une date et un créneau." };
  }

  const supabase = await createClient();
  // Toutes les règles (Nomad, solde, conflit, horaires) sont vérifiées par la base,
  // dans la même transaction que le débit des crédits.
  const { data, error } = await supabase.rpc("book_room", {
    p_room_id: roomId, p_starts_at: parisToIso(date, hour), p_hours: hours,
  });
  if (error) return { status: "error", message: error.message };

  const { data: room } = await supabase.from("rooms").select("name").eq("id", roomId).single();
  revalidatePath("/", "layout");
  return { status: "success", roomName: room?.name ?? "", startsAt: data.starts_at, endsAt: data.ends_at, cost: data.cost };
}
