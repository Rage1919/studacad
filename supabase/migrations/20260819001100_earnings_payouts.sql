-- Tutor economics use whole credits. One credit is settled as BWP 1.00.
-- A 20% fee is rounded to the nearest credit; earnings have a seven-day hold.
alter table public.tutor_earnings add column refunded_credits integer not null default 0 check (refunded_credits between 0 and gross_credits);
alter table public.tutor_earnings add column released_gross_credits integer;
alter table public.tutor_earnings add column released_platform_fee_credits integer;
alter table public.tutor_earnings add column released_net_credits integer;
alter table public.tutor_earnings add column released_at timestamptz;
alter table public.tutor_earnings add column updated_at timestamptz not null default now();
create trigger tutor_earnings_set_updated_at before update on public.tutor_earnings for each row execute function public.set_updated_at();

create table public.tutor_payout_destinations (
  id uuid primary key default gen_random_uuid(), tutor_user_id uuid not null references public.user_accounts(id) on delete restrict,
  provider text not null check (provider in ('manual_bank', 'manual_mobile_money')),
  masked_reference text not null check (length(masked_reference) between 4 and 100),
  external_kyc_reference text not null check (length(external_kyc_reference) between 4 and 100),
  status text not null default 'verified' check (status in ('verified', 'disabled')),
  verified_by_user_id uuid not null references public.user_accounts(id) on delete restrict,
  verified_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tutor_user_id, provider, masked_reference)
);
create trigger tutor_payout_destinations_set_updated_at before update on public.tutor_payout_destinations for each row execute function public.set_updated_at();
alter table public.tutor_payout_destinations enable row level security;

alter table public.tutor_payouts add column credits integer check (credits > 0);
alter table public.tutor_payouts add column destination_id uuid references public.tutor_payout_destinations(id) on delete restrict;
alter table public.tutor_payouts add column approved_by_user_id uuid references public.user_accounts(id) on delete restrict;
alter table public.tutor_payouts add column failure_reason text;
alter table public.tutor_payouts add column attempt_count integer not null default 1 check (attempt_count > 0);
alter table public.tutor_payouts add constraint tutor_payouts_bwp_credit_parity check (currency = 'BWP' and amount_minor % 100 = 0 and credits = amount_minor / 100);

create table public.tutor_payout_events (
  id uuid primary key default gen_random_uuid(), payout_id uuid not null references public.tutor_payouts(id) on delete restrict,
  from_status public.payout_status, to_status public.payout_status not null, attempt_count integer not null check (attempt_count > 0),
  actor_user_id uuid not null references public.user_accounts(id) on delete restrict, provider_reference text, reason text,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict, created_at timestamptz not null default now()
);
create index tutor_payout_events_payout_idx on public.tutor_payout_events (payout_id, created_at);
create trigger tutor_payout_events_immutable before update or delete on public.tutor_payout_events for each row execute function public.reject_immutable_mutation();
alter table public.tutor_payout_events enable row level security;

create table public.booking_refunds (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete restrict,
  learner_user_id uuid not null references public.user_accounts(id) on delete restrict, credits integer not null check (credits > 0),
  tutor_adjustment_credits integer not null check (tutor_adjustment_credits >= 0),
  platform_adjustment_credits integer not null check (platform_adjustment_credits >= 0),
  reason text not null check (length(reason) between 5 and 1000), idempotency_key text not null unique,
  ledger_transaction_id uuid not null unique references public.ledger_transactions(id) on delete restrict,
  actor_user_id uuid not null references public.user_accounts(id) on delete restrict, created_at timestamptz not null default now(),
  check (tutor_adjustment_credits + platform_adjustment_credits = credits)
);
create index booking_refunds_booking_idx on public.booking_refunds (booking_id, created_at);
create trigger booking_refunds_immutable before update or delete on public.booking_refunds for each row execute function public.reject_immutable_mutation();
alter table public.booking_refunds enable row level security;

create function public.calculate_platform_fee_credits(p_gross integer) returns integer language sql immutable strict set search_path = ''
as $$ select ((p_gross::bigint * 20 + 50) / 100)::integer $$;

create function public.sync_tutor_earning_from_booking() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tutor uuid; v_gross integer; v_fee integer;
begin
  select tutor_user_id into v_tutor from public.tutor_profiles where id = new.tutor_profile_id;
  if new.status in ('completed', 'no_show') then
    select count(*)::integer * new.price_per_learner_credits into v_gross from public.booking_participants where booking_id = new.id and cancelled_at is null;
    if v_gross > 0 then
      v_fee := public.calculate_platform_fee_credits(v_gross);
      insert into public.tutor_earnings (tutor_user_id, booking_id, gross_credits, platform_fee_credits, status, available_at)
      values (v_tutor, new.id, v_gross, v_fee, 'pending', new.ends_at + interval '7 days')
      on conflict (booking_id) do update set status = case when public.tutor_earnings.status = 'held' then 'pending'::public.earning_status else public.tutor_earnings.status end, available_at = excluded.available_at;
    end if;
  elsif new.status = 'disputed' then update public.tutor_earnings set status = 'held' where booking_id = new.id and status = 'pending';
  elsif new.status in ('cancelled_by_learner', 'cancelled_by_tutor', 'refunded') then update public.tutor_earnings set status = 'reversed' where booking_id = new.id and status in ('pending', 'held');
  end if;
  return new;
end; $$;

create function public.admin_transition_tutor_payout(p_actor uuid, p_payout uuid, p_target public.payout_status, p_provider_ref text default null, p_reason text default null)
returns public.payout_status language plpgsql security definer set search_path = '' as $$
declare v_row public.tutor_payouts%rowtype; v_tutor_wallet uuid; v_clearing uuid; v_settled uuid; v_tx uuid; v_attempt integer;
begin
  if not exists (select 1 from public.user_roles where user_id = p_actor and role = 'admin' and revoked_at is null) then raise exception 'Administrator role required' using errcode = '42501'; end if;
  select * into v_row from public.tutor_payouts where id = p_payout for update;
  if v_row.id is null then raise exception 'Payout not found' using errcode = 'P0001'; end if;
  if v_row.status = p_target then return v_row.status; end if;
  if not ((v_row.status = 'requested' and p_target in ('reviewing', 'cancelled')) or (v_row.status = 'reviewing' and p_target in ('processing', 'cancelled')) or
    (v_row.status = 'processing' and p_target in ('paid', 'failed')) or (v_row.status = 'failed' and p_target = 'processing')) then raise exception 'Unsupported payout transition' using errcode = '22023'; end if;
  insert into public.wallet_accounts (owner_user_id) values (v_row.tutor_user_id) on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_tutor_wallet;
  insert into public.wallet_accounts (system_code) values ('payout_clearing') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_clearing;
  perform 1 from public.wallet_accounts where id in (v_tutor_wallet, v_clearing) order by id for update;
  v_attempt := v_row.attempt_count;
  if v_row.status = 'failed' and p_target = 'processing' then
    if public.tutor_payout_available_credits(v_row.tutor_user_id) < v_row.credits then raise exception 'Insufficient available tutor earnings for retry' using errcode = 'P0001'; end if;
    v_attempt := v_row.attempt_count + 1;
    insert into public.ledger_transactions (kind, idempotency_key, description, actor_user_id, metadata) values
      ('payout', 'payout-retry:' || v_row.id::text || ':' || v_attempt::text, 'Tutor payout retry reserved', p_actor,
      jsonb_build_object('tutorUserId', v_row.tutor_user_id, 'payoutId', v_row.id, 'credits', v_row.credits, 'phase', 'retry_reserve', 'attempt', v_attempt)) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_tutor_wallet, -v_row.credits::bigint), (v_tx, v_clearing, v_row.credits::bigint);
  elsif p_target = 'paid' then
    if length(trim(coalesce(p_provider_ref, ''))) < 4 then raise exception 'Provider settlement reference required' using errcode = '22023'; end if;
    insert into public.wallet_accounts (system_code) values ('payout_settled') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_settled;
    perform 1 from public.wallet_accounts where id = v_settled for update;
    insert into public.ledger_transactions (kind, idempotency_key, description, actor_user_id, metadata) values
      ('payout', 'payout-settle:' || v_row.id::text || ':' || v_row.attempt_count::text, 'Tutor payout settled manually', p_actor,
      jsonb_build_object('tutorUserId', v_row.tutor_user_id, 'payoutId', v_row.id, 'credits', v_row.credits, 'phase', 'settled', 'providerReference', trim(p_provider_ref))) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_clearing, -v_row.credits::bigint), (v_tx, v_settled, v_row.credits::bigint);
  elsif p_target in ('failed', 'cancelled') then
    if length(trim(coalesce(p_reason, ''))) < 4 then raise exception 'Failure or cancellation reason required' using errcode = '22023'; end if;
    insert into public.ledger_transactions (kind, idempotency_key, description, actor_user_id, metadata) values
      ('payout', 'payout-return:' || v_row.id::text || ':' || v_row.attempt_count::text, 'Tutor payout reservation returned', p_actor,
      jsonb_build_object('tutorUserId', v_row.tutor_user_id, 'payoutId', v_row.id, 'credits', v_row.credits, 'phase', 'returned', 'reason', trim(p_reason))) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_clearing, -v_row.credits::bigint), (v_tx, v_tutor_wallet, v_row.credits::bigint);
  end if;
  update public.tutor_payouts set status = p_target, approved_by_user_id = p_actor,
    provider_payout_id = case when p_target = 'paid' then trim(p_provider_ref) else provider_payout_id end,
    failure_reason = case when p_target in ('failed', 'cancelled') then trim(p_reason) else null end,
    attempt_count = v_attempt, paid_at = case when p_target = 'paid' then now() else paid_at end where id = v_row.id;
  insert into public.tutor_payout_events (payout_id, from_status, to_status, attempt_count, actor_user_id, provider_reference, reason, ledger_transaction_id)
  values (v_row.id, v_row.status, p_target, v_attempt, p_actor, nullif(trim(coalesce(p_provider_ref, '')), ''), nullif(trim(coalesce(p_reason, '')), ''), v_tx);
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata) values
    (p_actor, 'tutor_payout.status_changed', 'tutor_payout', v_row.id, jsonb_build_object('fromStatus', v_row.status, 'toStatus', p_target, 'attempt', v_attempt, 'providerReference', p_provider_ref));
  return p_target;
end; $$;

create function public.admin_refund_booking(p_actor uuid, p_booking uuid, p_learner uuid, p_credits integer, p_reason text, p_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_earning public.tutor_earnings%rowtype; v_result uuid; v_paid integer; v_already integer; v_new_total integer; v_old_fee integer; v_new_fee integer;
  v_platform_adjustment integer; v_tutor_adjustment integer; v_learner_wallet uuid; v_source uuid; v_tutor_wallet uuid; v_platform uuid; v_tx uuid;
begin
  if not exists (select 1 from public.user_roles where user_id = p_actor and role = 'admin' and revoked_at is null) then raise exception 'Administrator role required' using errcode = '42501'; end if;
  if p_credits < 1 then raise exception 'Refund credits must be positive' using errcode = '22023'; end if;
  if length(trim(p_reason)) not between 5 and 1000 or length(trim(p_key)) not between 8 and 100 then raise exception 'Valid refund reason and idempotency key required' using errcode = '22023'; end if;
  select id into v_result from public.booking_refunds where idempotency_key = trim(p_key); if v_result is not null then return v_result; end if;
  if not exists (select 1 from public.booking_participants where booking_id = p_booking and learner_user_id = p_learner) then raise exception 'Learner is not a booking participant' using errcode = '42501'; end if;
  select (transaction.metadata ->> 'priceCredits')::integer into v_paid from public.ledger_transactions transaction where transaction.booking_id = p_booking and transaction.kind = 'hold'
    and transaction.metadata ->> 'learnerUserId' = p_learner::text order by created_at limit 1;
  if v_paid is null then raise exception 'Booking hold is missing' using errcode = 'P0001'; end if;
  select coalesce(sum(credits), 0)::integer into v_already from public.booking_refunds where booking_id = p_booking and learner_user_id = p_learner;
  if v_already + p_credits > v_paid then raise exception 'Refund exceeds learner payment' using errcode = '22023'; end if;
  select * into v_earning from public.tutor_earnings where booking_id = p_booking for update;
  if v_earning.id is null then raise exception 'Tutor earning is missing' using errcode = 'P0001'; end if;
  v_new_total := v_earning.refunded_credits + p_credits; if v_new_total > v_earning.gross_credits then raise exception 'Refund exceeds booking earning' using errcode = '22023'; end if;
  insert into public.wallet_accounts (owner_user_id) values (p_learner) on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_learner_wallet;
  if v_earning.released_at is null then
    v_tutor_adjustment := 0; v_platform_adjustment := p_credits;
    insert into public.wallet_accounts (system_code) values ('booking_escrow') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_source;
    perform 1 from public.wallet_accounts where id in (v_learner_wallet, v_source) order by id for update;
    insert into public.ledger_transactions (kind, idempotency_key, description, booking_id, actor_user_id, metadata) values
      ('refund', 'booking-refund:' || trim(p_key), 'Booking refund before earning release', p_booking, p_actor,
      jsonb_build_object('tutorUserId', v_earning.tutor_user_id, 'learnerUserId', p_learner, 'credits', p_credits, 'phase', 'escrow_refund')) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_source, -p_credits::bigint), (v_tx, v_learner_wallet, p_credits::bigint);
  else
    v_old_fee := v_earning.released_platform_fee_credits - public.calculate_platform_fee_credits(v_earning.released_gross_credits - v_earning.refunded_credits);
    v_new_fee := v_earning.released_platform_fee_credits - public.calculate_platform_fee_credits(greatest(0, v_earning.released_gross_credits - v_new_total));
    v_platform_adjustment := v_new_fee - v_old_fee; v_tutor_adjustment := p_credits - v_platform_adjustment;
    insert into public.wallet_accounts (owner_user_id) values (v_earning.tutor_user_id) on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_tutor_wallet;
    insert into public.wallet_accounts (system_code) values ('platform_revenue') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_platform;
    perform 1 from public.wallet_accounts where id in (v_learner_wallet, v_tutor_wallet, v_platform) order by id for update;
    insert into public.ledger_transactions (kind, idempotency_key, description, booking_id, actor_user_id, metadata) values
      ('refund', 'booking-refund:' || trim(p_key), 'Booking refund after earning release', p_booking, p_actor,
      jsonb_build_object('tutorUserId', v_earning.tutor_user_id, 'learnerUserId', p_learner, 'credits', p_credits, 'tutorAdjustmentCredits', v_tutor_adjustment, 'platformAdjustmentCredits', v_platform_adjustment, 'phase', 'post_release_refund')) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_tutor_wallet, -v_tutor_adjustment::bigint), (v_tx, v_platform, -v_platform_adjustment::bigint), (v_tx, v_learner_wallet, p_credits::bigint);
  end if;
  insert into public.booking_refunds (booking_id, learner_user_id, credits, tutor_adjustment_credits, platform_adjustment_credits, reason, idempotency_key, ledger_transaction_id, actor_user_id)
  values (p_booking, p_learner, p_credits, v_tutor_adjustment, v_platform_adjustment, trim(p_reason), trim(p_key), v_tx, p_actor) returning id into v_result;
  update public.tutor_earnings set refunded_credits = v_new_total, status = case when v_new_total = gross_credits then 'reversed'::public.earning_status else status end where id = v_earning.id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata) values
    (p_actor, 'booking.refunded', 'booking_refund', v_result, jsonb_build_object('bookingId', p_booking, 'learnerUserId', p_learner, 'credits', p_credits, 'transactionId', v_tx));
  return v_result;
end; $$;

create trigger bookings_sync_tutor_earning after insert or update of status on public.bookings for each row execute function public.sync_tutor_earning_from_booking();

insert into public.tutor_earnings (tutor_user_id, booking_id, gross_credits, platform_fee_credits, status, available_at)
select profile.tutor_user_id, booking.id, count(participant.learner_user_id)::integer * booking.price_per_learner_credits,
  public.calculate_platform_fee_credits(count(participant.learner_user_id)::integer * booking.price_per_learner_credits),
  case when booking.status = 'disputed' then 'held'::public.earning_status else 'pending'::public.earning_status end, booking.ends_at + interval '7 days'
from public.bookings booking join public.tutor_profiles profile on profile.id = booking.tutor_profile_id
join public.booking_participants participant on participant.booking_id = booking.id and participant.cancelled_at is null
where booking.status in ('completed', 'no_show', 'disputed') group by profile.tutor_user_id, booking.id on conflict (booking_id) do nothing;

create function public.release_available_tutor_earnings(p_limit integer default 100) returns integer language plpgsql security definer set search_path = '' as $$
declare v_earning public.tutor_earnings%rowtype; v_gross integer; v_fee integer; v_net integer; v_tutor_wallet uuid; v_escrow uuid; v_revenue uuid; v_tx uuid; v_count integer := 0;
begin
  if p_limit < 1 or p_limit > 500 then raise exception 'Release limit must be 1 to 500' using errcode = '22023'; end if;
  for v_earning in select earning.* from public.tutor_earnings earning join public.bookings booking on booking.id = earning.booking_id
    where earning.status = 'pending' and earning.available_at <= now() and booking.status in ('completed', 'no_show')
    order by earning.available_at, earning.id for update of earning skip locked limit p_limit
  loop
    v_gross := v_earning.gross_credits - v_earning.refunded_credits;
    if v_gross <= 0 then update public.tutor_earnings set status = 'reversed' where id = v_earning.id; continue; end if;
    v_fee := public.calculate_platform_fee_credits(v_gross); v_net := v_gross - v_fee;
    insert into public.wallet_accounts (owner_user_id) values (v_earning.tutor_user_id) on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_tutor_wallet;
    insert into public.wallet_accounts (system_code) values ('booking_escrow') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_escrow;
    insert into public.wallet_accounts (system_code) values ('platform_revenue') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_revenue;
    perform 1 from public.wallet_accounts where id in (v_tutor_wallet, v_escrow, v_revenue) order by id for update;
    insert into public.ledger_transactions (kind, idempotency_key, description, booking_id, metadata)
    values ('earning', 'earning-release:' || v_earning.id::text, 'Tutor earning released after dispute hold', v_earning.booking_id,
      jsonb_build_object('tutorUserId', v_earning.tutor_user_id, 'grossCredits', v_gross, 'platformFeeCredits', v_fee, 'netCredits', v_net, 'policy', '20_percent_fee_7_day_hold')) returning id into v_tx;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_escrow, -v_gross::bigint), (v_tx, v_tutor_wallet, v_net::bigint), (v_tx, v_revenue, v_fee::bigint);
    update public.tutor_earnings set status = 'available', ledger_transaction_id = v_tx, released_gross_credits = v_gross,
      released_platform_fee_credits = v_fee, released_net_credits = v_net, released_at = now() where id = v_earning.id;
    insert into public.audit_events (action, entity_type, entity_id, metadata) values ('tutor_earning.released', 'tutor_earning', v_earning.id, jsonb_build_object('transactionId', v_tx, 'grossCredits', v_gross, 'netCredits', v_net));
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$;

create function public.tutor_payout_available_credits(p_tutor_user_id uuid) returns integer language sql stable security definer set search_path = '' as $$
  select greatest(0, coalesce(sum(entry.amount_credits), 0))::integer from public.wallet_accounts wallet
  join public.ledger_entries entry on entry.wallet_account_id = wallet.id join public.ledger_transactions transaction on transaction.id = entry.transaction_id
  where wallet.owner_user_id = p_tutor_user_id and transaction.kind in ('earning', 'payout', 'refund') and transaction.metadata ->> 'tutorUserId' = p_tutor_user_id::text
$$;

create function public.verify_tutor_payout_destination(p_actor uuid, p_tutor uuid, p_provider text, p_masked text, p_kyc_ref text)
returns uuid language plpgsql security definer set search_path = '' as $$ declare v_id uuid;
begin
  if not exists (select 1 from public.user_roles where user_id = p_actor and role = 'admin' and revoked_at is null) then raise exception 'Administrator role required' using errcode = '42501'; end if;
  if p_provider not in ('manual_bank', 'manual_mobile_money') then raise exception 'Unsupported payout method' using errcode = '22023'; end if;
  if length(trim(p_masked)) not between 4 and 100 or length(trim(p_kyc_ref)) not between 4 and 100 then raise exception 'Masked destination and external verification reference are required' using errcode = '22023'; end if;
  if not exists (select 1 from public.user_roles where user_id = p_tutor and role = 'tutor' and revoked_at is null) then raise exception 'Active tutor role required' using errcode = '42501'; end if;
  insert into public.tutor_payout_destinations (tutor_user_id, provider, masked_reference, external_kyc_reference, verified_by_user_id)
  values (p_tutor, p_provider, trim(p_masked), trim(p_kyc_ref), p_actor) on conflict (tutor_user_id, provider, masked_reference) do update set
    external_kyc_reference = excluded.external_kyc_reference, status = 'verified', verified_by_user_id = excluded.verified_by_user_id, verified_at = now() returning id into v_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata) values (p_actor, 'tutor_payout_destination.verified', 'tutor_payout_destination', v_id, jsonb_build_object('tutorUserId', p_tutor, 'provider', p_provider, 'maskedReference', trim(p_masked)));
  return v_id;
end; $$;

create function public.request_tutor_payout(p_tutor uuid, p_destination uuid, p_credits integer, p_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_existing public.tutor_payouts%rowtype; v_dest public.tutor_payout_destinations%rowtype; v_tutor_wallet uuid; v_clearing uuid; v_tx uuid; v_payout uuid;
begin
  if p_credits < 100 then raise exception 'Minimum payout is 100 credits' using errcode = '22023'; end if;
  if length(trim(p_key)) not between 8 and 100 then raise exception 'Invalid payout idempotency key' using errcode = '22023'; end if;
  select * into v_existing from public.tutor_payouts where idempotency_key = 'tutor:' || p_tutor::text || ':' || trim(p_key);
  if v_existing.id is not null then if v_existing.credits <> p_credits or v_existing.destination_id <> p_destination then raise exception 'Payout idempotency key was already used' using errcode = '23505'; end if; return v_existing.id; end if;
  if not exists (select 1 from public.user_accounts where id = p_tutor and status = 'active') or not exists (select 1 from public.user_roles where user_id = p_tutor and role = 'tutor' and revoked_at is null) then raise exception 'Active tutor role required' using errcode = '42501'; end if;
  select * into v_dest from public.tutor_payout_destinations where id = p_destination and tutor_user_id = p_tutor and status = 'verified';
  if v_dest.id is null then raise exception 'Verified payout destination required' using errcode = '42501'; end if;
  insert into public.wallet_accounts (owner_user_id) values (p_tutor) on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id returning id into v_tutor_wallet;
  insert into public.wallet_accounts (system_code) values ('payout_clearing') on conflict (system_code) do update set system_code = excluded.system_code returning id into v_clearing;
  perform 1 from public.wallet_accounts where id in (v_tutor_wallet, v_clearing) order by id for update;
  if public.tutor_payout_available_credits(p_tutor) < p_credits then raise exception 'Insufficient available tutor earnings' using errcode = 'P0001'; end if;
  insert into public.ledger_transactions (kind, idempotency_key, description, actor_user_id, metadata) values
    ('payout', 'payout-reserve:' || p_tutor::text || ':' || trim(p_key), 'Tutor payout reserved', p_tutor, jsonb_build_object('tutorUserId', p_tutor, 'credits', p_credits, 'destinationId', p_destination, 'phase', 'reserve')) returning id into v_tx;
  insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits) values (v_tx, v_tutor_wallet, -p_credits::bigint), (v_tx, v_clearing, p_credits::bigint);
  insert into public.tutor_payouts (tutor_user_id, credits, amount_minor, currency, provider, destination_reference, destination_id, idempotency_key, ledger_transaction_id)
  values (p_tutor, p_credits, p_credits::bigint * 100, 'BWP', v_dest.provider, v_dest.masked_reference, v_dest.id, 'tutor:' || p_tutor::text || ':' || trim(p_key), v_tx) returning id into v_payout;
  insert into public.tutor_payout_events (payout_id, from_status, to_status, attempt_count, actor_user_id, ledger_transaction_id) values (v_payout, null, 'requested', 1, p_tutor, v_tx);
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata) values (p_tutor, 'tutor_payout.requested', 'tutor_payout', v_payout, jsonb_build_object('credits', p_credits, 'destination', v_dest.masked_reference));
  return v_payout;
end; $$;

revoke all on function public.calculate_platform_fee_credits(integer) from public;
revoke all on function public.release_available_tutor_earnings(integer) from public;
revoke all on function public.tutor_payout_available_credits(uuid) from public;
revoke all on function public.verify_tutor_payout_destination(uuid, uuid, text, text, text) from public;
revoke all on function public.request_tutor_payout(uuid, uuid, integer, text) from public;
revoke all on function public.admin_transition_tutor_payout(uuid, uuid, public.payout_status, text, text) from public;
revoke all on function public.admin_refund_booking(uuid, uuid, uuid, integer, text, text) from public;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then
  execute 'grant execute on function public.calculate_platform_fee_credits(integer) to service_role';
  execute 'grant execute on function public.release_available_tutor_earnings(integer) to service_role';
  execute 'grant execute on function public.tutor_payout_available_credits(uuid) to service_role';
  execute 'grant execute on function public.verify_tutor_payout_destination(uuid, uuid, text, text, text) to service_role';
  execute 'grant execute on function public.request_tutor_payout(uuid, uuid, integer, text) to service_role';
  execute 'grant execute on function public.admin_transition_tutor_payout(uuid, uuid, public.payout_status, text, text) to service_role';
  execute 'grant execute on function public.admin_refund_booking(uuid, uuid, uuid, integer, text, text) to service_role';
end if; end $$;
