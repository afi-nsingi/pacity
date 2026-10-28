// Recette automatique des règles métier, contre la vraie base Supabase.
// Usage : node --env-file=.env.local scripts/test-rules.mjs
// Se connecte avec les comptes de démo (identifiants lus dans demo-accounts.local.md,
// jamais affichés), joue chaque cas du brief, annule ce qu’il a créé puis l’efface.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const creds = Object.fromEntries(
  [...readFileSync("demo-accounts.local.md", "utf8").matchAll(/\*\*(.+?)\*\*.*?: (\S+) \/ `(.+?)`/g)]
    .map(([, name, email, password]) => [name.split(" ")[0], { email, password }]),
);

async function as(name) {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword(creds[name]);
  if (error) throw new Error(`Connexion ${name} impossible : ${error.message}`);
  return client;
}

// Prochain jour ouvré à J+2 (heure de Paris), à une heure donnée.
function slot(hour, dayOffset = 2) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + dayOffset);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  const date = d.toISOString().slice(0, 10);
  const probe = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  const parisHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(probe));
  return new Date(probe.getTime() - (parisHour - hour) * 3600000).toISOString();
}

const testStart = new Date().toISOString();
let passed = 0, failed = 0;
const created = [];
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log(`  ✓ ${label}`); } else { failed++; console.log(`  ✗ ${label} ${detail}`); }
}
const balance = async (c) => (await c.from("member_balances").select("balance").single()).data.balance;

const lea = await as("Léa"), hugo = await as("Hugo"), sami = await as("Sami"), mathieu = await as("Mathieu");
const { data: rooms } = await lea.from("rooms").select("id, name, credits_per_hour").order("sort_order");
const room = (n) => rooms.find((r) => r.name === n);

console.log("Réservation et crédits");
const leaBefore = await balance(lea);
const ok1 = await lea.rpc("book_room", { p_room_id: room("Small Room").id, p_starts_at: slot(10) });
check("Léa réserve la Small Room (1 h) : confirmée", !ok1.error && ok1.data?.status === "confirmed", ok1.error?.message);
if (ok1.data) created.push(ok1.data.id);
check("Léa est débitée de 2 crédits", (await balance(lea)) === leaBefore - 2);

const twoH = await lea.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(14), p_hours: 2 });
check("Réservation de 2 h (option V1) : coût 2 × 1 crédit", !twoH.error && twoH.data?.cost === 2, twoH.error?.message);
if (twoH.data) created.push(twoH.data.id);

console.log("Refus automatiques");
const conflict = await hugo.rpc("book_room", { p_room_id: room("Small Room").id, p_starts_at: slot(10) });
check("Hugo sur le même créneau : refusé (conflit)", /déjà réservé/.test(conflict.error?.message ?? ""), conflict.error?.message);
const overlap = await hugo.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(15) });
check("Chevauchement partiel (15:00 dans 14:00–16:00) : refusé", /déjà réservé/.test(overlap.error?.message ?? ""), overlap.error?.message);
const poor = await hugo.rpc("book_room", { p_room_id: room("Large Room").id, p_starts_at: slot(11) });
check("Hugo (2 crédits) en Large Room : solde insuffisant", /Solde insuffisant/.test(poor.error?.message ?? ""), poor.error?.message);
const nomad = await sami.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(9) });
check("Sami (Nomad) : refusé", /Nomad/.test(nomad.error?.message ?? ""), nomad.error?.message);
const past = await lea.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: new Date(Date.now() - 86400000).toISOString() });
check("Créneau passé : refusé", /passé/.test(past.error?.message ?? ""), past.error?.message);
const late = await lea.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(19), p_hours: 2 });
check("Fin après 20:00 : refusé", /08:00 à 20:00/.test(late.error?.message ?? ""), late.error?.message);
const manager = await mathieu.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(9) });
check("Le gérant ne réserve pas : refusé", !!manager.error, "");

console.log("Droits");
const leaSees = await lea.from("bookings").select("member_id");
check("Léa ne voit que ses réservations", leaSees.data.every((b) => b.member_id === leaSees.data[0]?.member_id));
const hugoSees = await hugo.from("bookings").select("id");
check("Hugo ne voit pas la réservation de Léa", !hugoSees.data.some((b) => created.includes(b.id)));
const direct = await lea.from("credit_ledger").insert({ member_id: ok1.data?.member_id, amount: 100, kind: "adjustment", label: "triche" });
check("Écriture directe de crédits impossible", !!direct.error);
const memberCancel = await lea.rpc("cancel_booking", { p_booking_id: created[0], p_reason: "test" });
check("Un membre ne peut pas annuler via le gérant", /gérant/.test(memberCancel.error?.message ?? ""), memberCancel.error?.message);
const mgrSees = await mathieu.from("bookings").select("id").in("id", created);
check("Le gérant voit toutes les réservations", mgrSees.data.length === created.length);

console.log("Annulation par le gérant");
const noReason = await mathieu.rpc("cancel_booking", { p_booking_id: created[0], p_reason: " " });
check("Motif obligatoire", /motif/.test(noReason.error?.message ?? ""), noReason.error?.message);
const beforeCancel = await balance(lea);
for (const id of created) {
  const c = await mathieu.rpc("cancel_booking", { p_booking_id: id, p_reason: "Recette automatique" });
  check(`Annulation ${id.slice(0, 8)} : remboursée`, !c.error && c.data?.status === "cancelled", c.error?.message);
}
check("Léa récupère 4 crédits (2 + 2)", (await balance(lea)) === beforeCancel + 4);
const twice = await mathieu.rpc("cancel_booking", { p_booking_id: created[0], p_reason: "encore" });
check("Double annulation : refusée (aucun double remboursement)", /déjà annulée/.test(twice.error?.message ?? ""), twice.error?.message);
check("Solde de Léa revenu au départ", (await balance(lea)) === leaBefore);

// Nettoyage : la recette ne laisse aucune trace dans la démo. Personne ne peut supprimer
// depuis l'application (règle métier) : on passe par la clé d'administration, lue dans .env.local.
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log("Gestion des membres (abonnement)");
const samiId = (await sami.from("profiles").select("id").single()).data.id;
const samiBefore = await balance(sami);
const hack = await hugo.rpc("set_member_plan", { p_member_id: samiId, p_plan: "full_time" });
check("Un membre ne peut pas changer un abonnement", /gérant/.test(hack.error?.message ?? ""), hack.error?.message);
const toFull = await mathieu.rpc("set_member_plan", { p_member_id: samiId, p_plan: "full_time" });
check("Le gérant passe Sami en Full Time", !toFull.error && toFull.data?.plan === "full_time", toFull.error?.message);
check("Sami reçoit tout de suite les 20 crédits du mois", (await balance(sami)) === samiBefore + 20);
await mathieu.rpc("set_member_plan", { p_member_id: samiId, p_plan: "nomad" });
await mathieu.rpc("set_member_plan", { p_member_id: samiId, p_plan: "full_time" });
check("Repasser Full Time le même mois : pas de doublon", (await balance(sami)) === samiBefore + 20);
await mathieu.rpc("set_member_plan", { p_member_id: samiId, p_plan: "nomad" });
check("Retour en Nomad : crédits conservés", (await balance(sami)) === samiBefore + 20);
const frozen = await sami.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(9) });
check("Retour en Nomad : crédits gelés (réservation refusée)", /Nomad/.test(frozen.error?.message ?? ""), frozen.error?.message);
// Remise en état de Sami (Nomad, sans les crédits du test).
await admin.from("credit_ledger").delete().eq("member_id", samiId).eq("kind", "monthly").gte("created_at", new Date(Date.now() - 600000).toISOString());
check("Sami remis dans son état de départ", (await balance(sami)) === samiBefore);
const planEvents = await mathieu.from("subscription_events").select("event").eq("member_id", samiId).eq("event", "plan_change").gte("created_at", testStart);
check("Historique : chaque changement d'abonnement est tracé (4)", planEvents.data?.length === 4, String(planEvents.data?.length));

console.log("Résiliation et réactivation");
const hugoId = (await hugo.from("profiles").select("id").single()).data.id;
const hugoBefore = await balance(hugo);
const future = await hugo.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(16) });
if (future.data) created.push(future.data.id);
const hackCancel = await hugo.rpc("cancel_membership", { p_member_id: hugoId, p_reason: "test" });
check("Un membre ne peut pas résilier", /gérant/.test(hackCancel.error?.message ?? ""), hackCancel.error?.message);
const noMotive = await mathieu.rpc("cancel_membership", { p_member_id: hugoId, p_reason: " " });
check("Résiliation : motif obligatoire", /motif/.test(noMotive.error?.message ?? ""), noMotive.error?.message);
const resil = await mathieu.rpc("cancel_membership", { p_member_id: hugoId, p_reason: "Recette automatique" });
check("Résiliation : 1 réservation à venir annulée", !resil.error && resil.data === 1, resil.error?.message ?? String(resil.data));
check("Résiliation : réservation remboursée, crédits conservés", (await balance(hugo)) === hugoBefore);
const blockedBooking = await hugo.rpc("book_room", { p_room_id: room("Phone Booth").id, p_starts_at: slot(17) });
check("Résilié : réservation impossible", /résilié/.test(blockedBooking.error?.message ?? ""), blockedBooking.error?.message);
const noRenew = await admin.rpc("grant_current_month", { p_member_id: hugoId });
check("Résilié : aucun renouvellement", noRenew.data === 0, JSON.stringify(noRenew));
const noPlanChange = await mathieu.rpc("set_member_plan", { p_member_id: hugoId, p_plan: "nomad" });
check("Résilié : changement d'abonnement refusé", /réactivez/.test(noPlanChange.error?.message ?? ""), noPlanChange.error?.message);
const react = await mathieu.rpc("reactivate_membership", { p_member_id: hugoId, p_plan: "full_time" });
check("Réactivation : membre actif en Full Time", !react.error && react.data?.status === "active", react.error?.message);
const hugoEvents = await mathieu.from("subscription_events").select("event, note").eq("member_id", hugoId).gte("created_at", testStart).order("created_at");
check("Historique : résiliation (avec motif) puis réactivation",
  hugoEvents.data?.map((e) => e.event).join(",") === "cancellation,reactivation" && hugoEvents.data?.[0].note === "Recette automatique",
  JSON.stringify(hugoEvents.data));
// Remise en état : crédits éventuels de la réactivation et événements de la recette.
await admin.from("credit_ledger").delete().eq("member_id", hugoId).eq("kind", "monthly").gte("created_at", testStart);
await admin.from("subscription_events").delete().in("member_id", [samiId, hugoId]).neq("event", "signup").gte("created_at", testStart);
check("Hugo remis dans son état de départ", (await balance(hugo)) === hugoBefore);
if (created.length) {
  const ledger = await admin.from("credit_ledger").delete().in("booking_id", created);
  const bookings = await admin.from("bookings").delete().in("id", created);
  check("Nettoyage des réservations de test", !ledger.error && !bookings.error, ledger.error?.message ?? bookings.error?.message);
}
check("Solde de Léa inchangé après nettoyage", (await balance(lea)) === leaBefore);

console.log(`\n${passed} réussis, ${failed} échoués`);
process.exit(failed ? 1 : 0);
