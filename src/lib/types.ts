export type Role = "member" | "manager";
export type Plan = "nomad" | "full_time";
export type BookingStatus = "confirmed" | "cancelled";
export type CreditKind = "initial" | "monthly" | "booking" | "refund" | "adjustment";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  plan: Plan | null;
};

export type Room = {
  id: string;
  name: string;
  capacity: number;
  usage: string;
  credits_per_hour: number;
  description: string;
  photo_url: string | null;
  unavailable_reason: string | null;
};

export type Booking = {
  id: string;
  member_id: string;
  room_id: string;
  starts_at: string;
  ends_at: string;
  cost: number;
  status: BookingStatus;
  cancel_reason: string | null;
  created_at: string;
  rooms?: { name: string } | null;
  profiles?: { full_name: string } | null;
};

export type LedgerEntry = {
  id: string;
  member_id: string;
  amount: number;
  kind: CreditKind;
  label: string;
  created_at: string;
  profiles?: { full_name: string } | null;
};

export const PLAN_LABEL: Record<Plan, string> = { nomad: "Nomad", full_time: "Full Time" };

export const KIND_LABEL: Record<CreditKind, string> = {
  initial: "Initial",
  monthly: "Renouvellement",
  booking: "Réservation",
  refund: "Remboursement",
  adjustment: "Ajustement",
};
