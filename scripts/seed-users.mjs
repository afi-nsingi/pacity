// Crée les comptes de démonstration et leurs crédits de départ.
// Usage : node --env-file=.env.local scripts/seed-users.mjs
// Les mots de passe sont générés ici et écrits dans demo-accounts.local.md
// (fichier ignoré par Git : il ne doit jamais être publié).
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies dans .env.local");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const DOMAIN = process.env.DEMO_EMAIL_BASE ?? "afi.nsingi01@gmail.com";
const alias = (tag) => DOMAIN.replace("@", `+${tag}@`);

// Crédits datés du 1er du mois, comme une vraie recharge (offset : 0 = ce mois-ci, -1 = le mois précédent).
const monthStart = (offset) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
};
const monthName = (offset) => new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(`${monthStart(offset)}T12:00:00Z`));
const monthLabel = (offset) => `${monthStart(offset).slice(5, 7)}/${monthStart(offset).slice(0, 4)}`;

// Profils du cas : Léa (Full Time, crédits confortables), Hugo (Full Time, solde bas
// pour tester « solde insuffisant »), Sami (Nomad), Mathieu (gérant).
const USERS = [
  { tag: "lea", full_name: "Léa Martin", role: "member", plan: "full_time", credits: [[20, "initial", `Solde reporté (${monthName(-1)})`, -1], [20, "monthly", `Renouvellement mensuel · ${monthLabel(0)}`, 0]] },
  { tag: "hugo", full_name: "Hugo Bernard", role: "member", plan: "full_time", credits: [[2, "initial", "Crédits initiaux (profil de démonstration)", 0]] },
  { tag: "sami", full_name: "Sami Boucher", role: "member", plan: "nomad", credits: [] },
  { tag: "mathieu", full_name: "Mathieu", role: "manager", plan: null, credits: [] },
];

// Format lisible « Prénom.123456789 » : prénom sans accent + 9 chiffres tirés au hasard
// (pas une suite fixe : l'appli est publique et les prénoms sont visibles dans le code).
const password = (fullName) => {
  const first = fullName.split(" ")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return `${first}.${Array.from({ length: 9 }, () => randomInt(10)).join("")}`;
};
const lines = ["# Comptes de démonstration Pacity (NE PAS PUBLIER)", ""];

for (const u of USERS) {
  const email = alias(u.tag);
  const pwd = password(u.full_name);
  let { data: created, error } = await admin.auth.admin.createUser({ email, password: pwd, email_confirm: true });
  if (error && /already/i.test(error.message)) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((x) => x.email === email);
    await admin.auth.admin.updateUserById(existing.id, { password: pwd });
    created = { user: existing };
    error = null;
  }
  if (error) throw error;
  const id = created.user.id;

  const { error: pErr } = await admin.from("profiles")
    .upsert({ id, full_name: u.full_name, role: u.role, plan: u.plan });
  if (pErr) throw pErr;

  const { count } = await admin.from("credit_ledger").select("id", { count: "exact", head: true }).eq("member_id", id);
  if (!count) {
    for (const [amount, kind, label, offset] of u.credits) {
      const day = monthStart(offset);
      // 06:00 UTC = 08:00 à Paris en heure d’été (07:00 en hiver) : un ordre de grandeur suffit pour la démo.
      const { error: cErr } = await admin.from("credit_ledger")
        .insert({ member_id: id, amount, kind, label, period: kind === "monthly" ? day : null, created_at: `${day}T06:00:00Z` });
      if (cErr) throw cErr;
    }
  }
  lines.push(`- **${u.full_name}** (${u.role === "manager" ? "gérant" : u.plan}) : ${email} / \`${pwd}\``);
  console.log(`✓ ${u.full_name} prêt`);
}

writeFileSync("demo-accounts.local.md", lines.join("\n") + "\n");
console.log("Identifiants écrits dans demo-accounts.local.md (ignoré par Git).");
