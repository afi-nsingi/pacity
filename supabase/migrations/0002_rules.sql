-- Pacity : règles métier (fonctions appelées par l'application).
-- Chaque fonction s'exécute dans une seule transaction : soit tout réussit
-- (réservation + débit), soit rien n'est écrit.

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'manager');
$$;

-- ---------------------------------------------------------------------------
-- Réserver une salle (confirmation immédiate, en un clic)
-- ---------------------------------------------------------------------------
create or replace function public.book_room(p_room_id uuid, p_starts_at timestamptz, p_hours int default 1)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
  v_room rooms;
  v_ends_at timestamptz;
  v_local timestamp;          -- début en heure de Paris
  v_cost int;
  v_balance int;
  v_booking bookings;
begin
  select * into v_profile from profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Vous devez être connecté pour réserver.';
  end if;
  if v_profile.role <> 'member' then
    raise exception 'Seuls les membres peuvent réserver une salle.';
  end if;
  if v_profile.plan = 'nomad' then
    raise exception 'Votre abonnement Nomad ne permet pas de réserver une salle.';
  end if;

  select * into v_room from rooms where id = p_room_id;
  if v_room.id is null then
    raise exception 'Salle introuvable.';
  end if;
  if v_room.unavailable_reason is not null then
    raise exception 'Cette salle n''est pas réservable pour le moment : %.', v_room.unavailable_reason;
  end if;

  if p_hours is null or p_hours < 1 or p_hours > 4 then
    raise exception 'Une réservation dure de 1 à 4 heures.';
  end if;

  v_ends_at := p_starts_at + make_interval(hours => p_hours);
  v_local := p_starts_at at time zone 'Europe/Paris';

  -- Règles de calendrier (hypothèses H1 à H3 du cadrage). Le formulaire les
  -- impose déjà, mais la base reste la garde finale.
  if p_starts_at < now() then
    raise exception 'Ce créneau est déjà passé : choisissez une date à venir.';
  end if;
  if p_starts_at > now() + interval '30 days' then
    raise exception 'Les réservations sont ouvertes 30 jours à l''avance.';
  end if;
  if extract(isodow from v_local) > 5 then
    raise exception 'Le coworking est fermé le week-end : choisissez un jour de semaine.';
  end if;
  if extract(minute from v_local) <> 0 or extract(second from v_local) <> 0 then
    raise exception 'Les créneaux commencent à l''heure pile.';
  end if;
  if extract(hour from v_local) < 8
     or (v_ends_at at time zone 'Europe/Paris') > date_trunc('day', v_local) + interval '20 hours' then
    raise exception 'Les salles sont réservables de 08:00 à 20:00.';
  end if;

  v_cost := v_room.credits_per_hour * p_hours;
  select balance into v_balance from member_balances where member_id = v_profile.id;
  if v_balance < v_cost then
    raise exception 'Solde insuffisant : % crédits requis, % disponibles.', v_cost, v_balance;
  end if;

  begin
    insert into bookings (member_id, room_id, starts_at, ends_at, cost)
    values (v_profile.id, v_room.id, p_starts_at, v_ends_at, v_cost)
    returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'Ce créneau est déjà réservé : choisissez un autre horaire ou une autre salle.';
  end;

  insert into credit_ledger (member_id, amount, kind, booking_id, label)
  values (v_profile.id, -v_cost, 'booking', v_booking.id,
          'Réservation ' || v_room.name || ' · ' || to_char(v_local, 'DD/MM HH24:MI'));

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Annuler une réservation (gérant, n'importe laquelle) avec remboursement
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  v_booking bookings;
  v_room rooms;
begin
  if not is_manager() then
    raise exception 'Seul le gérant peut annuler une réservation.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Indiquez le motif de l''annulation.';
  end if;

  -- Verrou de ligne : deux annulations simultanées ne remboursent qu'une fois.
  select * into v_booking from bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'Réservation introuvable.';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'Cette réservation est déjà annulée.';
  end if;

  update bookings
     set status = 'cancelled', cancel_reason = trim(p_reason),
         cancelled_by = auth.uid(), cancelled_at = now()
   where id = p_booking_id
  returning * into v_booking;

  select * into v_room from rooms where id = v_booking.room_id;
  insert into credit_ledger (member_id, amount, kind, booking_id, label)
  values (v_booking.member_id, v_booking.cost, 'refund', v_booking.id,
          'Remboursement ' || v_room.name || ' · ' ||
          to_char(v_booking.starts_at at time zone 'Europe/Paris', 'DD/MM HH24:MI'));

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- Renouvellement mensuel : +20 crédits aux Full Time, cumulables
-- (idempotent : relancer la fonction le même mois n'ajoute rien)
-- ---------------------------------------------------------------------------
create or replace function public.grant_monthly_credits()
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  insert into credit_ledger (member_id, amount, kind, label, period)
  select p.id, 20, 'monthly', 'Renouvellement mensuel · ' || to_char(v_period, 'MM/YYYY'), v_period
    from profiles p
   where p.role = 'member' and p.plan = 'full_time'
  on conflict (member_id, period) where kind = 'monthly' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Créneaux occupés d'une salle, sans le nom des membres (pour tous les connectés)
-- ---------------------------------------------------------------------------
create or replace function public.room_busy_slots(p_room_id uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.starts_at, b.ends_at
    from bookings b
   where b.room_id = p_room_id and b.status = 'confirmed'
     and b.starts_at < p_to and b.ends_at > p_from
     and auth.uid() is not null
   order by b.starts_at;
$$;

-- Créneaux pris à venir, toutes salles (page Réserver), sans le nom des membres.
create or replace function public.upcoming_busy_slots()
returns table (room_id uuid, room_name text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.room_id, r.name, b.starts_at, b.ends_at
    from bookings b join rooms r on r.id = b.room_id
   where b.status = 'confirmed' and b.ends_at > now()
     and auth.uid() is not null
   order by b.starts_at;
$$;

-- ---------------------------------------------------------------------------
-- Droits (Row Level Security)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.credit_ledger enable row level security;

create policy "profil : soi-même ou gérant" on public.profiles
  for select using (id = auth.uid() or public.is_manager());

create policy "salles : lecture pour les connectés" on public.rooms
  for select using (auth.uid() is not null);
create policy "salles : modification par le gérant" on public.rooms
  for update using (public.is_manager()) with check (public.is_manager());

create policy "réservations : les siennes ou toutes pour le gérant" on public.bookings
  for select using (member_id = auth.uid() or public.is_manager());

create policy "crédits : les siens ou tous pour le gérant" on public.credit_ledger
  for select using (member_id = auth.uid() or public.is_manager());

-- Aucune écriture directe : réservations et crédits passent par les fonctions ci-dessus.
revoke insert, update, delete on public.bookings, public.credit_ledger from anon, authenticated;
revoke execute on function public.grant_monthly_credits() from anon, authenticated, public;
grant execute on function public.book_room(uuid, timestamptz, int) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.room_busy_slots(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.upcoming_busy_slots() to authenticated;

-- Planification : le 1er de chaque mois à 07:00 UTC (08:00 ou 09:00 à Paris).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('pacity-monthly-credits', '0 7 1 * *', $$select public.grant_monthly_credits()$$);
