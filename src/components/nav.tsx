"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Briefcase, CalendarPlus, CreditCard, Home, Inbox, LogOut, MoreHorizontal, UserRound, Wallet,
} from "lucide-react";
import type { NavItem } from "./nav-items";
import { signOut } from "@/app/login/actions";

const ICONS = {
  home: Home, "calendar-plus": CalendarPlus, inbox: Inbox, "credit-card": CreditCard,
  briefcase: Briefcase, wallet: Wallet,
} as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** Liens de la barre latérale (ordinateur et tablette). */
export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-accent-soft text-accent-dark" : "text-ink hover:bg-cream"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barre du bas (téléphone) : 4 onglets au plus, le reste dans « Plus ». */
export function BottomBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = items.length > 4 ? items.slice(0, 3) : items;
  const extra = items.length > 4 ? items.slice(3) : [];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute bottom-20 right-3 w-56 rounded-2xl border border-line bg-surface p-2 shadow-xl">
            {extra.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS];
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${visible.length + (extra.length ? 1 : 0)}, minmax(0, 1fr))` }}>
        {visible.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}>
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        {extra.length > 0 && (
          <button type="button" onClick={() => setOpen((o) => !o)}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
              extra.some((i) => isActive(pathname, i.href)) ? "text-accent" : "text-muted"}`}>
            <MoreHorizontal className="h-5 w-5" /> Plus
          </button>
        )}
      </nav>
    </>
  );
}

/** Menu du profil : Mon compte, Se déconnecter. */
export function ProfileMenu({ name, detail }: { name: string; detail: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-cream">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-white">
          {name.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-xs text-muted">{detail}</span>
        </span>
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-line bg-surface p-2 shadow-xl md:bottom-full max-md:top-full max-md:bottom-auto max-md:mt-2 max-md:left-auto max-md:w-56">
          <Link href="/compte" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream">
            <UserRound className="h-4 w-4" /> Mon compte
          </Link>
          <form action={signOut}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger hover:bg-danger-soft">
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
