import type { Role } from "@/lib/types";

export type NavItem = { href: string; label: string; icon: string; roles: Role[] };

// Même menu que la version Softr, ordonné selon la fréquence d'usage :
// chaque rôle ne voit que ses liens (membre : 5, gérant : 4).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: "home", roles: ["member", "manager"] },
  { href: "/reserver", label: "Réserver", icon: "calendar-plus", roles: ["member"] },
  { href: "/mes-reservations", label: "Mes réservations", icon: "inbox", roles: ["member"] },
  { href: "/gerant/reservations", label: "Réservations", icon: "inbox", roles: ["manager"] },
  { href: "/salles", label: "Salles", icon: "briefcase", roles: ["member", "manager"] },
  { href: "/mon-solde", label: "Mon solde", icon: "wallet", roles: ["member"] },
];

export const navFor = (role: Role) => NAV_ITEMS.filter((i) => i.roles.includes(role));
