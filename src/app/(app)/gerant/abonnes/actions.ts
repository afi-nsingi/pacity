"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession, firstName } from "@/lib/session";
import { passwordLink, trustedOrigin } from "@/lib/site";
import { sendMail } from "@/lib/mail";
import { welcomeEmail } from "@/lib/emails";

export type MemberState = { status: "idle" } | { status: "error"; message: string } | { status: "done"; message: string; at: number };

const PLANS = ["full_time", "nomad"] as const;
type Plan = (typeof PLANS)[number];
const isPlan = (v: string): v is Plan => (PLANS as readonly string[]).includes(v);

async function requireManager() {
  const session = await getSession();
  return session?.profile.role === "manager";
}

/** Crée le compte, la fiche membre et (Full Time) les crédits du mois, puis envoie l'e-mail de bienvenue. */
export async function createMember(_prev: MemberState, formData: FormData): Promise<MemberState> {
  if (!(await requireManager())) return { status: "error", message: "Seul le gérant peut ajouter un membre." };

  const fullName = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "");
  if (fullName.length < 2) return { status: "error", message: "Indiquez le nom du membre." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Indiquez une adresse e-mail valide." };
  if (!isPlan(plan)) return { status: "error", message: "Choisissez un abonnement." };

  const admin = createAdminClient();
  const origin = await trustedOrigin();
  if (!admin || !origin) return { status: "error", message: "L’ajout de membres n’est pas disponible pour le moment." };

  // Compte sans mot de passe : le membre le choisira lui-même via le lien de l'e-mail.
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !created.user) {
    return { status: "error", message: /already|exists|registered/i.test(error?.message ?? "")
      ? "Un compte existe déjà avec cette adresse e-mail."
      : "Le compte n’a pas pu être créé. Réessayez dans un instant." };
  }

  const id = created.user.id;
  const { error: profileError } = await admin.from("profiles").insert({ id, full_name: fullName, role: "member", plan });
  if (profileError) {
    await admin.auth.admin.deleteUser(id); // on ne laisse pas un compte sans fiche membre
    return { status: "error", message: "La fiche du membre n’a pas pu être créée. Réessayez dans un instant." };
  }
  if (plan === "full_time") await admin.rpc("grant_current_month", { p_member_id: id });

  after(async () => {
    const link = await passwordLink(origin, email, "&bienvenue=1");
    if (link) await sendMail(welcomeEmail(email, firstName(fullName), plan, link));
  });
  revalidatePath("/", "layout");
  return { status: "done", at: Date.now(), message: `${fullName} est inscrit·e. Un e-mail de bienvenue part à ${email} pour choisir son mot de passe.` };
}

/** Change l'abonnement (règle : passage Full Time = crédits du mois tout de suite ; Nomad = crédits gelés). */
export async function changePlan(_prev: MemberState, formData: FormData): Promise<MemberState> {
  const memberId = String(formData.get("member") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!isPlan(plan)) return { status: "error", message: "Choisissez un abonnement." };

  const supabase = await createClient();
  // Droits (gérant uniquement) et crédits du mois : vérifiés par la base (set_member_plan).
  const { error } = await supabase.rpc("set_member_plan", { p_member_id: memberId, p_plan: plan });
  if (error) return { status: "error", message: error.message };
  revalidatePath("/", "layout");
  return { status: "done", at: Date.now(), message: plan === "full_time"
    ? "Abonnement Full Time enregistré : les 20 crédits du mois sont sur son compte (s’il ne les avait pas déjà)."
    : "Abonnement Nomad enregistré : ses crédits restent sur son compte mais il ne peut plus réserver." };
}

/** Résilier : statut, annulation et remboursement des réservations à venir, puis compte bloqué. */
export async function cancelMember(_prev: MemberState, formData: FormData): Promise<MemberState> {
  const memberId = String(formData.get("member") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const supabase = await createClient();
  // Droits, motif obligatoire, annulations et remboursements : vérifiés par la base (cancel_membership).
  const { data: cancelled, error } = await supabase.rpc("cancel_membership", { p_member_id: memberId, p_reason: reason });
  if (error) return { status: "error", message: error.message };
  // Plus de connexion : le compte est bloqué (réversible à la réactivation).
  await createAdminClient()?.auth.admin.updateUserById(memberId, { ban_duration: "876000h" });
  revalidatePath("/", "layout");
  const n = Number(cancelled ?? 0);
  return { status: "done", at: Date.now(), message: `Abonnement résilié.${n ? ` ${n} réservation${n > 1 ? "s" : ""} à venir annulée${n > 1 ? "s" : ""} et remboursée${n > 1 ? "s" : ""}.` : ""} Le membre ne peut plus se connecter ; ses crédits sont conservés.` };
}

/** Réactiver avec un abonnement : connexion rétablie, crédits du mois si Full Time. */
export async function reactivateMember(_prev: MemberState, formData: FormData): Promise<MemberState> {
  const memberId = String(formData.get("member") ?? "");
  const plan = String(formData.get("plan") ?? "");
  if (!isPlan(plan)) return { status: "error", message: "Choisissez un abonnement." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reactivate_membership", { p_member_id: memberId, p_plan: plan });
  if (error) return { status: "error", message: error.message };
  await createAdminClient()?.auth.admin.updateUserById(memberId, { ban_duration: "none" });
  revalidatePath("/", "layout");
  return { status: "done", at: Date.now(), message: "Abonnement réactivé : le membre peut de nouveau se connecter." };
}
