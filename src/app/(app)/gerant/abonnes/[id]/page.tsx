import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { formatDate, formatSlot, formatTime } from "@/lib/dates";
import { PLAN_LABEL, type Booking, type LedgerEntry, type Plan } from "@/lib/types";
import { Amount, EmptyState, KindBadge, SectionTitle, StatCard, StatusBadge } from "@/components/ui";
import { CancelMembershipPanel, PlanEditor, ReactivatePanel } from "../member-forms";

type Member = { id: string; full_name: string; role: string; plan: Plan | null; status: "active" | "cancelled" };
type SubscriptionEvent = {
  id: string; event: "signup" | "plan_change" | "cancellation" | "reactivation";
  from_plan: Plan | null; to_plan: Plan | null; note: string | null; created_at: string;
  author: { full_name: string } | null;
};

const plan = (p: Plan | null) => (p ? PLAN_LABEL[p] : "—");

/** Libellé lisible d'un événement d'abonnement. */
function describe(e: SubscriptionEvent) {
  switch (e.event) {
    case "signup": return { title: `Inscription · ${plan(e.to_plan)}`, tone: "bg-sage" };
    case "plan_change": return { title: `Changement d’abonnement : ${plan(e.from_plan)} → ${plan(e.to_plan)}`, tone: "bg-mustard" };
    case "cancellation": return { title: `Résiliation (abonnement ${plan(e.from_plan)})`, tone: "bg-danger" };
    case "reactivation": return { title: `Réactivation · ${plan(e.to_plan)}`, tone: "bg-accent" };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle<{ full_name: string }>();
  return { title: data?.full_name ?? "Membre introuvable" };
}

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession("manager");
  const { id } = await params;
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("id, full_name, role, plan, status").eq("id", id).eq("role", "member").maybeSingle<Member>();
  if (!member) notFound();

  const [{ data: bal }, { data: events }, { data: bookings }, { data: ledger }] = await Promise.all([
    supabase.from("member_balances").select("balance").eq("member_id", id).maybeSingle(),
    supabase.from("subscription_events")
      .select("id, event, from_plan, to_plan, note, created_at, author:profiles!subscription_events_created_by_fkey(full_name)")
      .eq("member_id", id).order("created_at", { ascending: false }).returns<SubscriptionEvent[]>(),
    supabase.from("bookings").select("id, starts_at, ends_at, cost, status, cancel_reason, rooms(name)")
      .eq("member_id", id).order("starts_at", { ascending: false }).returns<Booking[]>(),
    supabase.from("credit_ledger").select("id, amount, kind, label, created_at").eq("member_id", id)
      .order("created_at", { ascending: false }).returns<LedgerEntry[]>(),
  ]);

  const history = events ?? [];
  const signup = [...history].reverse().find((e) => e.event === "signup");
  const cancellation = member.status === "cancelled" ? history.find((e) => e.event === "cancellation") : undefined;
  const now = Date.now();
  const upcoming = (bookings ?? []).filter((b) => b.status === "confirmed" && new Date(b.starts_at).getTime() > now).length;
  const active = member.status === "active";

  return (
    <>
      <Link href="/gerant/abonnes" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" /> Tous les membres
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="page-title">{member.full_name}</h1>
        {active
          ? <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-sage">Actif</span>
          : <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">Résilié</span>}
      </div>

      {cancellation && (
        <p className="mb-6 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Abonnement résilié le {formatDate(cancellation.created_at)}{cancellation.note ? ` : ${cancellation.note}` : ""}. Le membre ne peut plus se connecter ; ses {bal?.balance ?? 0} crédits sont conservés.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Solde" value={bal?.balance ?? 0} hint={active ? "crédits disponibles" : "crédits gelés"} tone="accent" />
        <StatCard label="Abonnement" value={plan(member.plan)} hint={member.plan === "full_time" ? "20 crédits par mois" : "sans réservation"} />
        <StatCard label="Membre depuis" value={signup ? formatDate(signup.created_at) : "—"} />
        <StatCard label="Réservations à venir" value={upcoming} tone="sage" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {active && member.plan ? (
          <>
            <div className="card space-y-2 p-5">
              <p className="font-semibold">Abonnement</p>
              <PlanEditor key={member.plan} memberId={member.id} plan={member.plan} upcoming={upcoming} />
            </div>
            <CancelMembershipPanel memberId={member.id} upcoming={upcoming} />
          </>
        ) : (
          <ReactivatePanel memberId={member.id} lastPlan={member.plan} />
        )}
      </div>

      <SectionTitle title="Historique de l’abonnement" lead="Inscription, changements, résiliation et réactivation, avec la date et l’auteur." />
      {history.length === 0 ? <EmptyState>Aucun événement enregistré.</EmptyState> : (
        <ol className="card divide-y divide-line">
          {history.map((e) => {
            const d = describe(e);
            return (
              <li key={e.id} className="flex gap-4 px-5 py-4">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${d.tone}`} />
                <div className="min-w-0">
                  <p className="font-medium">{d.title}</p>
                  {e.note && <p className="text-sm text-muted">Motif : {e.note}</p>}
                  <p className="text-xs text-muted">
                    {formatDate(e.created_at)} à {formatTime(e.created_at)}{e.author ? ` · par ${e.author.full_name}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <SectionTitle title="Réservations" lead="Toutes les réservations du membre, des plus récentes aux plus anciennes." />
      {(bookings ?? []).length === 0 ? <EmptyState>Aucune réservation.</EmptyState> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Créneau</th><th>Salle</th><th>Statut</th><th className="text-right">Crédits</th><th>Motif</th></tr></thead>
            <tbody>
              {(bookings ?? []).map((b) => (
                <tr key={b.id}>
                  <td>{formatDate(b.starts_at)}</td>
                  <td className="tabular-nums">{formatSlot(b.starts_at, b.ends_at)}</td>
                  <td>{b.rooms?.name}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="text-right tabular-nums">{b.cost}</td>
                  <td className="text-sm text-muted">{b.cancel_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionTitle title="Crédits" lead="Chaque recharge, réservation et remboursement du membre." />
      {(ledger ?? []).length === 0 ? <EmptyState>Aucun mouvement.</EmptyState> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Libellé</th><th className="text-right">Crédits</th></tr></thead>
            <tbody>
              {(ledger ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.created_at)}</td>
                  <td><KindBadge kind={e.kind} /></td>
                  <td>{e.label}</td>
                  <td className="text-right"><Amount value={e.amount} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
