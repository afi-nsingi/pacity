import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { formatDate, ledgerPeriod } from "@/lib/dates";
import { KIND_LABEL, PLAN_LABEL, type LedgerEntry, type Profile } from "@/lib/types";
import { Amount, EmptyState, KindBadge, PageHeader, SectionTitle } from "@/components/ui";
import { FilterBar } from "@/components/filters";
import { AddMemberPanel, PlanEditor } from "./member-forms";

export const metadata = { title: "Membres et crédits" };

const PERIODS = ["Aujourd’hui", "7 derniers jours", "Ce mois-ci", "Plus ancien"];
type Search = { q?: string; abonnement?: string; statut?: string; periode?: string; membre?: string; type?: string };

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSession("manager");
  const f = await searchParams;
  const supabase = await createClient();
  const [{ data: profiles }, { data: balances }, { data: ledger }, { data: bookings }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, plan, status").eq("role", "member").order("full_name").returns<Profile[]>(),
    supabase.from("member_balances").select("member_id, balance"),
    supabase.from("credit_ledger").select("id, member_id, amount, kind, label, created_at, profiles(full_name)")
      .order("created_at", { ascending: false }).returns<LedgerEntry[]>(),
    supabase.from("bookings").select("member_id, status"),
  ]);

  // Seuls les membres avec un abonnement apparaissent (le gérant est exclu).
  const subscribers = (profiles ?? []).filter((p) => p.plan).map((p) => {
    const lastGrant = (ledger ?? []).find((e) => e.member_id === p.id && e.kind === "monthly");
    return {
      ...p,
      balance: balances?.find((b) => b.member_id === p.id)?.balance ?? 0,
      lastGrant: lastGrant?.created_at ?? null,
      confirmed: (bookings ?? []).filter((b) => b.member_id === p.id && b.status === "confirmed").length,
    };
  });
  const q = f.q?.toLowerCase().trim();
  const shown = subscribers.filter((s) =>
    (!f.abonnement || (s.plan && PLAN_LABEL[s.plan] === f.abonnement)) &&
    (!f.statut || (f.statut === "Résilié") === (s.status === "cancelled")) && (!q || s.full_name.toLowerCase().includes(q)));

  const names = subscribers.map((s) => s.full_name);
  const history = (ledger ?? []).filter((e) =>
    (!f.periode || ledgerPeriod(e.created_at) === f.periode) &&
    (!f.membre || e.profiles?.full_name === f.membre) &&
    (!f.type || KIND_LABEL[e.kind] === f.type));

  return (
    <>
      <PageHeader title="Membres et crédits"
        lead="Ajoutez un membre, changez ou résiliez son abonnement et suivez ses crédits. Cliquez sur un nom pour voir sa fiche et son historique. Les Full Time reçoivent automatiquement 20 crédits le 1er de chaque mois, cumulables." />

      <AddMemberPanel />

      <FilterBar searchPlaceholder="Rechercher un membre" filters={[
        { name: "abonnement", label: "Abonnement", options: Object.values(PLAN_LABEL) },
        { name: "statut", label: "Statut", options: ["Actif", "Résilié"] },
      ]} />
      {shown.length === 0 ? <EmptyState>Aucun membre ne correspond à ces filtres.</EmptyState> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Membre</th><th>Statut</th><th>Abonnement</th><th>Crédits par mois</th><th className="text-right">Solde</th><th>Dernier renouvellement</th><th className="text-right">Réservations confirmées</th></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium"><Link href={`/gerant/abonnes/${s.id}`} className="hover:text-accent hover:underline">{s.full_name}</Link></td>
                  <td>{s.status === "cancelled"
                    ? <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">Résilié</span>
                    : <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs font-semibold text-sage">Actif</span>}</td>
                  <td>{s.plan && (s.status === "cancelled"
                    ? <span className="text-sm text-muted">{PLAN_LABEL[s.plan]} (gelé)</span>
                    : <PlanEditor key={s.plan} memberId={s.id} plan={s.plan} upcoming={s.confirmed} />)}</td>
                  <td>{s.plan === "full_time" ? "20 crédits" : "Aucun (Nomad)"}</td>
                  <td className="text-right font-semibold tabular-nums">{s.balance}</td>
                  <td>{s.lastGrant ? formatDate(s.lastGrant) : "—"}</td>
                  <td className="text-right tabular-nums">{s.confirmed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SectionTitle title="Historique des crédits" lead="Chaque recharge, réservation et remboursement, au crédit près. Filtrez par membre ou par type de mouvement." />
      <FilterBar filters={[
        { name: "periode", label: "Période", options: PERIODS },
        { name: "membre", label: "Membre", options: names },
        { name: "type", label: "Type", options: Object.values(KIND_LABEL) },
      ]} />
      {history.length === 0 ? <EmptyState>Aucun mouvement ne correspond à ces filtres.</EmptyState> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Membre</th><th>Type</th><th>Libellé</th><th className="text-right">Crédits</th></tr></thead>
            <tbody>
              {history.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.created_at)}</td>
                  <td className="font-medium">{e.profiles?.full_name}</td>
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
