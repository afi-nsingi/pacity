-- Pacity : gestion des membres par le gérant (abonnement, crédits du mois).
-- Règle retenue (option A) : un membre qui passe Full Time reçoit tout de suite les
-- 20 crédits du mois en cours ; un membre qui passe Nomad garde ses crédits, gelés
-- (un Nomad ne peut pas réserver), et ses réservations confirmées sont maintenues.

-- ---------------------------------------------------------------------------
-- Crédite les 20 crédits du mois en cours à un membre Full Time, s'il ne les a pas déjà.
-- Interne : appelée par set_member_plan et par la création d'un membre (clé d'administration).
-- ---------------------------------------------------------------------------
create or replace function public.grant_current_month(p_member_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  insert into credit_ledger (member_id, amount, kind, label, period)
  select p.id, 20, 'monthly', 'Renouvellement mensuel · ' || to_char(v_period, 'MM/YYYY'), v_period
    from profiles p
   where p.id = p_member_id and p.role = 'member' and p.plan = 'full_time'
  on conflict (member_id, period) where kind = 'monthly' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Changer l'abonnement d'un membre (gérant uniquement)
-- ---------------------------------------------------------------------------
create or replace function public.set_member_plan(p_member_id uuid, p_plan public.subscription_plan)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_profile profiles;
begin
  if not is_manager() then
    raise exception 'Seul le gérant peut modifier un abonnement.';
  end if;

  update profiles set plan = p_plan
   where id = p_member_id and role = 'member'
  returning * into v_profile;
  if v_profile.id is null then
    raise exception 'Membre introuvable.';
  end if;

  -- Passage en Full Time : les crédits du mois tout de suite (jamais deux fois le même mois).
  if p_plan = 'full_time' then
    perform grant_current_month(p_member_id);
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.grant_current_month(uuid) from anon, authenticated, public;
grant execute on function public.grant_current_month(uuid) to service_role;
grant execute on function public.set_member_plan(uuid, public.subscription_plan) to authenticated;
