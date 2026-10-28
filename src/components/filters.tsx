"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export type FilterDef = { name: string; label: string; options: string[] };

/** Barre de filtres : chaque choix met à jour l'adresse (?salle=…), la page se recharge côté serveur. */
export function FilterBar({ filters, searchPlaceholder }: { filters: FilterDef[]; searchPlaceholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const active = filters.some((f) => params.get(f.name)) || params.get("q");

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {searchPlaceholder && (
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input defaultValue={params.get("q") ?? ""} placeholder={searchPlaceholder}
            className="field !rounded-full pl-9" onChange={(e) => update("q", e.target.value)} />
        </label>
      )}
      {filters.map((f) => (
        <select key={f.name} value={params.get(f.name) ?? ""} onChange={(e) => update(f.name, e.target.value)}
          className={`rounded-full border px-3 py-2 text-sm ${params.get(f.name) ? "border-accent bg-accent-soft text-accent-dark" : "border-line bg-surface"}`}>
          <option value="">{f.label}</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
      {active && (
        <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="text-sm text-muted underline hover:text-accent">
          Tout effacer
        </button>
      )}
    </div>
  );
}
