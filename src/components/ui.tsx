import type { BookingStatus, CreditKind } from "@/lib/types";
import { KIND_LABEL } from "@/lib/types";

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {children}
    </div>
  );
}

/** Bandeau d'accueil en dégradé terracotta → moutarde (comme la version Softr). */
export function WelcomeBanner({ date, title, text }: { date: string; title: string; text: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-mustard px-6 py-8 text-white sm:px-10 sm:py-10">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cream/20" />
      <div className="absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-sage/30" />
      <div className="relative">
        <p className="text-sm font-medium text-white/85">📅 {date}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-xl text-white/90">{text}</p>
      </div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "ink" }: { label: string; value: string | number; hint?: string; tone?: "ink" | "accent" | "sage" }) {
  const color = tone === "accent" ? "text-accent" : tone === "sage" ? "text-sage" : "text-ink";
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return status === "confirmed"
    ? <span className="inline-flex rounded-full bg-sage-soft px-2.5 py-1 text-xs font-semibold text-sage">Confirmée</span>
    : <span className="inline-flex rounded-full bg-mustard-soft px-2.5 py-1 text-xs font-semibold text-[#9a6a0c]">Annulée</span>;
}

const KIND_STYLE: Record<CreditKind, string> = {
  monthly: "bg-sage-soft text-sage",
  initial: "bg-sage-soft text-sage",
  refund: "bg-mustard-soft text-[#9a6a0c]",
  booking: "bg-accent-soft text-accent-dark",
  adjustment: "bg-[#e5ecf7] text-[#3b5b8c]",
};

export function KindBadge({ kind }: { kind: CreditKind }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${KIND_STYLE[kind]}`}>{KIND_LABEL[kind]}</span>;
}

export function Amount({ value }: { value: number }) {
  return <span className={`font-semibold tabular-nums ${value > 0 ? "text-sage" : "text-accent-dark"}`}>{value > 0 ? `+${value}` : value}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center text-sm text-muted">{children}</div>;
}

export function SectionTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-4 mt-10">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
    </div>
  );
}
