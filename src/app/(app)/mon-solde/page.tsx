import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { formatDate, ledgerPeriod } from "@/lib/dates";
import { KIND_LABEL, PLAN_LABEL, type LedgerEntry } from "@/lib/types";
import { Amount, EmptyState, KindBadge, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { FilterBar } from "@/components/filters";

export const metadata = { title: "Mon solde" };

const PERIODS = ["Aujourd’hui", "7 derniers jours", "Ce mois-ci", "Plus ancien"];

export default async function BalancePage({ searchParams }: { searchParams: Promise<{ periode?: string; type?: string }> }) {
  const { profile, balance } = await requireSession("member");
  const filters = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("credit_ledger")
    .select("id, amount, kind, label, created_at")
    .eq("member_id", profile.id).order("created_at", { ascending: false })
    .returns<LedgerEntry[]>();
  const all = data ?? [];
  const rows = all.filter((e) =>
    (!filters.periode || ledgerPeriod(e.created_at) === filters.periode) &&
    (!filters.type || KIND_LABEL[e.kind] === filters.type));
  const isFullTime = profile.plan === "full_time";

  return (
    <>
      <PageHeader title="Mon solde" lead="Vos crédits, votre abonnement et chaque mouvement, en toute transparence." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mon solde de crédits" value={balance} hint="crédits disponibles" tone="accent" />
        <StatCard label="Abonnement" value={profile.plan ? PLAN_LABEL[profile.plan] : "—"} />
        <StatCard label="Renouvellement mensuel" value={isFullTime ? "20 crédits" : "Aucun"}
          hint={isFullTime ? "le 1er de chaque mois, cumulables" : "abonnement Nomad"} tone={isFullTime ? "sage" : "ink"} />
      </div>

      <SectionTitle title="Historique de mes crédits" lead="Chaque crédit reçu ou utilisé, en toute transparence." />
      <FilterBar filters={[
        { name: "periode", label: "Période", options: PERIODS },
        { name: "type", label: "Type", options: Object.values(KIND_LABEL) },
      ]} />
      {rows.length === 0 ? (
        <EmptyState>{all.length === 0 ? "Aucun mouvement pour l’instant." : "Aucun mouvement ne correspond à ces filtres."}</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Libellé</th><th className="text-right">Crédits</th></tr></thead>
            <tbody>
              {rows.map((e) => (
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
