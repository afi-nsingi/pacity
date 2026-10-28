-- Pacity : schéma de la base et règles métier.
-- Les règles du brief sont garanties par la base elle-même :
--   * pas de chevauchement de réservations confirmées (contrainte d'exclusion) ;
--   * débit des crédits et création de la réservation dans la même transaction ;
--   * solde = somme d'un registre de mouvements (jamais modifié à la main) ;
--   * renouvellement mensuel idempotent (une seule recharge par membre et par mois).

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('member', 'manager');
create type public.subscription_plan as enum ('nomad', 'full_time');
create type public.booking_status as enum ('confirmed', 'cancelled');
create type public.credit_kind as enum ('initial', 'monthly', 'booking', 'refund', 'adjustment');

-- ---------------------------------------------------------------------------
-- Profils (un par compte Supabase Auth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'member',
  plan public.subscription_plan,            -- null pour le gérant
  created_at timestamptz not null default now(),
  constraint member_has_plan check (role = 'manager' or plan is not null)
);

-- ---------------------------------------------------------------------------
-- Salles
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  capacity int not null check (capacity > 0),
  usage text not null,                      -- Appels, Réunion, Conférence
  credits_per_hour int not null check (credits_per_hour > 0),
  description text not null default '',
  photo_url text,
  -- V1 du brief : salle non réservable (travaux, fuite, privatisation)
  unavailable_reason text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Réservations
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id),
  room_id uuid not null references public.rooms (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cost int not null check (cost > 0),
  status public.booking_status not null default 'confirmed',
  cancel_reason text,
  cancelled_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint valid_range check (ends_at > starts_at),
  -- Règle centrale : deux réservations confirmées d'une même salle
  -- ne peuvent jamais se chevaucher, quel que soit le chemin d'écriture.
  constraint no_overlap exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);

create index bookings_member_idx on public.bookings (member_id, starts_at desc);
create index bookings_room_idx on public.bookings (room_id, starts_at);

-- ---------------------------------------------------------------------------
-- Registre des crédits
-- ---------------------------------------------------------------------------
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id),
  amount int not null check (amount <> 0),
  kind public.credit_kind not null,
  booking_id uuid references public.bookings (id),
  label text not null,
  period date,                              -- mois concerné pour les recharges
  created_at timestamptz not null default now()
);

create index credit_ledger_member_idx on public.credit_ledger (member_id, created_at desc);
-- Une seule recharge mensuelle par membre et par mois.
create unique index one_monthly_grant on public.credit_ledger (member_id, period) where kind = 'monthly';
-- Un seul débit et un seul remboursement par réservation.
create unique index one_booking_debit on public.credit_ledger (booking_id) where kind = 'booking';
create unique index one_booking_refund on public.credit_ledger (booking_id) where kind = 'refund';

create view public.member_balances with (security_invoker = true) as
  select p.id as member_id, coalesce(sum(l.amount), 0)::int as balance
  from public.profiles p
  left join public.credit_ledger l on l.member_id = p.id
  group by p.id;
