-- Pacity : historique des abonnements, résiliation et réactivation.
-- Règles retenues (28/10) : un membre résilié ne peut plus se connecter (compte bloqué côté
-- application) ; ses réservations confirmées à venir sont annulées et remboursées ; ses crédits
-- restent sur son compte, gelés, sans renouvellement, jusqu'à une éventuelle réactivation.

alter table public.profiles
  add column if not exists status text not null default 'active'
  check (status in ('active', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Historique : une ligne par événement, écrite par un déclencheur (aucun chemin ne l'évite).
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  event text not null check (event in ('signup', 'plan_change', 'cancellation', 'reactivation')),
  from_plan public.subscription_plan,
  to_plan public.subscription_plan,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists subscription_events_member_idx on public.subscription_events (member_id, created_at desc);

alter table public.subscription_events enable row level security;
drop policy if exists "historique : le sien ou tous pour le gérant" on public.subscription_events;
create policy "historique : le sien ou tous pour le gérant" on public.subscription_events
  for select using (member_id = auth.uid() or public.is_manager());
revoke insert, update, delete on public.subscription_events from anon, authenticated;

create or replace function public.log_subscription_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_note text := nullif(current_setting('pacity.motif', true), '');
begin
  if new.role <> 'member' then return new; end if;
  if tg_op = 'INSERT' then
    insert into subscription_events (member_id, event, to_plan, created_by)
    values (new.id, 'signup', new.plan, auth.uid());
  elsif old.status = 'active' and new.status = 'cancelled' then
    insert into subscription_events (member_id, event, from_plan, note, created_by)
    values (new.id, 'cancellation', old.plan, v_note, auth.uid());
  elsif old.status = 'cancelled' and new.status = 'active' then
    insert into subscription_events (member_id, event, from_plan, to_plan, created_by)
    values (new.id, 'reactivation', old.plan, new.plan, auth.uid());
  elsif old.plan is distinct from new.plan then
    insert into subscription_events (member_id, event, from_plan, to_plan, created_by)
    values (new.id, 'plan_change', old.plan, new.plan, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_subscription_history on public.profiles;
create trigger profiles_subscription_history
  after insert or update of plan, status on public.profiles
  for each row execute function public.log_subscription_event();

-- Membres déjà inscrits : on reprend leur date de création de compte.
insert into public.subscription_events (member_id, event, to_plan, created_at)
select p.id, 'signup', p.plan, u.created_at
  from public.profiles p join auth.users u on u.id = p.id
 where p.role = 'member'
   and not exists (select 1 from public.subscription_events e where e.member_id = p.id and e.event = 'signup');

-- ---------------------------------------------------------------------------
-- Un membre résilié ne réserve plus (garde finale, même si une session traîne).
-- ---------------------------------------------------------------------------
create or replace function public.block_cancelled_members()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = new.member_id and status = 'cancelled') then
    raise exception 'Votre abonnement est résilié : la réservation n''est plus possible.';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_block_cancelled on public.bookings;
create trigger bookings_block_cancelled before insert on public.bookings
  for each row execute function public.block_cancelled_members();

-- ---------------------------------------------------------------------------
-- Renouvellements : uniquement les membres actifs.
-- ---------------------------------------------------------------------------
create or replace function public.grant_monthly_credits()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  insert into credit_ledger (member_id, amount, kind, label, period)
  select p.id, 20, 'monthly', 'Renouvellement mensuel · ' || to_char(v_period, 'MM/YYYY'), v_period
    from profiles p
   where p.role = 'member' and p.plan = 'full_time' and p.status = 'active'
  on conflict (member_id, period) where kind = 'monthly' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.grant_current_month(p_member_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  insert into credit_ledger (member_id, amount, kind, label, period)
  select p.id, 20, 'monthly', 'Renouvellement mensuel · ' || to_char(v_period, 'MM/YYYY'), v_period
    from profiles p
   where p.id = p_member_id and p.role = 'member' and p.plan = 'full_time' and p.status = 'active'
  on conflict (member_id, period) where kind = 'monthly' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Un membre résilié doit d'abord être réactivé avant de changer d'abonnement.
create or replace function public.set_member_plan(p_member_id uuid, p_plan public.subscription_plan)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
begin
  if not is_manager() then
    raise exception 'Seul le gérant peut modifier un abonnement.';
  end if;
  update profiles set plan = p_plan
   where id = p_member_id and role = 'member' and status = 'active'
  returning * into v_profile;
  if v_profile.id is null then
    raise exception 'Membre introuvable ou abonnement résilié (réactivez-le d''abord).';
  end if;
  if p_plan = 'full_time' then
    perform grant_current_month(p_member_id);
  end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Résilier (gérant) : statut, annulation + remboursement des réservations à venir.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_membership(p_member_id uuid, p_reason text)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_booking record;
  v_count int := 0;
begin
  if not is_manager() then
    raise exception 'Seul le gérant peut résilier un abonnement.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Indiquez le motif de la résiliation.';
  end if;
  perform set_config('pacity.motif', trim(p_reason), true);
  update profiles set status = 'cancelled' where id = p_member_id and role = 'member' and status = 'active';
  if not found then
    raise exception 'Membre introuvable ou déjà résilié.';
  end if;
  for v_booking in
    select id from bookings where member_id = p_member_id and status = 'confirmed' and starts_at > now()
  loop
    perform cancel_booking(v_booking.id, 'Résiliation de l''abonnement');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Réactiver (gérant) avec un abonnement ; Full Time = crédits du mois s'il ne les a pas déjà.
create or replace function public.reactivate_membership(p_member_id uuid, p_plan public.subscription_plan)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
begin
  if not is_manager() then
    raise exception 'Seul le gérant peut réactiver un abonnement.';
  end if;
  update profiles set status = 'active', plan = p_plan
   where id = p_member_id and role = 'member' and status = 'cancelled'
  returning * into v_profile;
  if v_profile.id is null then
    raise exception 'Membre introuvable ou déjà actif.';
  end if;
  if p_plan = 'full_time' then
    perform grant_current_month(p_member_id);
  end if;
  return v_profile;
end;
$$;

grant execute on function public.cancel_membership(uuid, text) to authenticated;
grant execute on function public.reactivate_membership(uuid, public.subscription_plan) to authenticated;
revoke execute on function public.log_subscription_event() from anon, authenticated, public;
revoke execute on function public.block_cancelled_members() from anon, authenticated, public;
