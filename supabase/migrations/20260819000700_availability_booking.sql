create table public.booking_location_details (
  booking_id uuid primary key references public.bookings(id) on delete restrict,
  learner_address text,
  tutor_location_note text,
  created_at timestamptz not null default now(),
  constraint booking_location_present check (learner_address is not null or tutor_location_note is not null),
  constraint booking_learner_address_length check (learner_address is null or length(learner_address) between 5 and 500),
  constraint booking_tutor_location_length check (tutor_location_note is null or length(tutor_location_note) between 2 and 500)
);
alter table public.booking_location_details enable row level security;

create function public.list_tutor_slots(
  p_tutor_slug text,
  p_from timestamptz,
  p_to timestamptz,
  p_format public.session_format,
  p_examination public.exam_level,
  p_subject text
)
returns table (
  tutor_profile_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  format public.session_format,
  examination public.exam_level,
  subject text,
  price_credits integer,
  capacity integer,
  remaining_capacity integer
  , location_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  with profile as (
    select tutor.id, tutor.timezone, subject_row.examination, subject_row.subject,
      case when p_format = 'online_group'
        then greatest(1, round(subject_row.price_credits * 0.6)::integer)
        else subject_row.price_credits
      end as price_credits,
      case when p_format = 'online_group' then format_row.group_capacity else 1 end as capacity,
      format_row.location_note
    from public.tutor_profiles tutor
    join public.tutor_profile_subjects subject_row on subject_row.tutor_profile_id = tutor.id
    join public.tutor_profile_formats format_row on format_row.tutor_profile_id = tutor.id and format_row.format = p_format
    where tutor.slug = trim(p_tutor_slug)
      and tutor.status = 'active'
      and subject_row.examination = p_examination
      and lower(subject_row.subject) = lower(trim(p_subject))
  ), candidates as (
    select profile.id as tutor_profile_id,
      slot.starts_at,
      slot.starts_at + make_interval(mins => rule.slot_duration_minutes) as ends_at,
      rule.timezone,
      profile.examination,
      profile.subject,
      profile.price_credits,
      profile.capacity,
      profile.location_note,
      rule.buffer_before_minutes,
      rule.buffer_after_minutes
    from profile
    join public.availability_rules rule on rule.tutor_profile_id = profile.id and rule.format = p_format
    cross join lateral generate_series(
      (p_from at time zone rule.timezone)::date,
      (p_to at time zone rule.timezone)::date,
      interval '1 day'
    ) day(local_date)
    cross join lateral generate_series(
      ((day.local_date::date + rule.local_start_time) at time zone rule.timezone),
      ((day.local_date::date + rule.local_end_time) at time zone rule.timezone) - make_interval(mins => rule.slot_duration_minutes),
      make_interval(mins => rule.slot_duration_minutes)
    ) slot(starts_at)
    where extract(dow from day.local_date)::smallint = rule.weekday
      and day.local_date::date between rule.effective_from and coalesce(rule.effective_until, 'infinity'::date)
      and slot.starts_at >= p_from
      and slot.starts_at < p_to
      and slot.starts_at >= now() + make_interval(mins => rule.lead_time_minutes)
  ), with_group as (
    select candidate.*, existing.id as existing_group_booking_id,
      coalesce(participants.active_count, 0) as active_count
    from candidates candidate
    left join lateral (
      select booking.id
      from public.bookings booking
      where p_format = 'online_group'
        and booking.tutor_profile_id = candidate.tutor_profile_id
        and booking.format = p_format
        and booking.examination = candidate.examination
        and lower(booking.subject) = lower(candidate.subject)
        and booking.starts_at = candidate.starts_at
        and booking.ends_at = candidate.ends_at
        and booking.status in ('pending', 'held', 'confirmed')
      limit 1
    ) existing on true
    left join lateral (
      select count(*)::integer as active_count
      from public.booking_participants participant
      where participant.booking_id = existing.id and participant.cancelled_at is null
    ) participants on existing.id is not null
  )
  select candidate.tutor_profile_id, candidate.starts_at, candidate.ends_at,
    candidate.timezone, p_format, candidate.examination, candidate.subject,
    candidate.price_credits, candidate.capacity,
    greatest(0, candidate.capacity - candidate.active_count)::integer,
    candidate.location_note
  from with_group candidate
  where not exists (
    select 1 from public.availability_exceptions exception
    where exception.tutor_profile_id = candidate.tutor_profile_id
      and exception.available = false
      and tstzrange(exception.starts_at, exception.ends_at, '[)') && tstzrange(candidate.starts_at, candidate.ends_at, '[)')
  ) and (
    (p_format = 'online_group' and candidate.existing_group_booking_id is not null and candidate.active_count < candidate.capacity)
    or (
      candidate.existing_group_booking_id is null
      and not exists (
        select 1 from public.bookings booking
        where booking.tutor_profile_id = candidate.tutor_profile_id
          and booking.status in ('pending', 'held', 'confirmed')
          and booking.slot && tstzrange(
            candidate.starts_at - make_interval(mins => candidate.buffer_before_minutes),
            candidate.ends_at + make_interval(mins => candidate.buffer_after_minutes), '[)'
          )
      )
    )
  )
  order by candidate.starts_at;
$$;

create function public.replace_tutor_availability(
  p_actor_user_id uuid,
  p_rules jsonb,
  p_exceptions jsonb,
  p_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_rule_count integer;
  v_exception_count integer;
  v_subject_count integer;
  v_format_count integer;
begin
  select profile.id into v_profile_id
  from public.tutor_profiles profile
  join public.user_accounts account on account.id = profile.tutor_user_id
  join public.user_roles role on role.user_id = account.id and role.role = 'tutor' and role.revoked_at is null
  where profile.tutor_user_id = p_actor_user_id
    and profile.status = 'active'
    and account.status = 'active'
  for update of profile;
  if v_profile_id is null then
    raise exception 'Only an active approved tutor may manage availability' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rules) <> 'array' or jsonb_typeof(p_exceptions) <> 'array'
    or jsonb_typeof(p_settings) <> 'object'
    or jsonb_typeof(p_settings -> 'subjects') <> 'array'
    or jsonb_typeof(p_settings -> 'formats') <> 'array' then
    raise exception 'Availability rules and exceptions must be arrays' using errcode = '22023';
  end if;
  v_rule_count := jsonb_array_length(p_rules);
  v_exception_count := jsonb_array_length(p_exceptions);
  v_subject_count := jsonb_array_length(p_settings -> 'subjects');
  v_format_count := jsonb_array_length(p_settings -> 'formats');
  if v_rule_count > 100 or v_exception_count > 200 then
    raise exception 'Availability update is too large' using errcode = '22023';
  end if;

  if v_subject_count <> (select count(*) from public.tutor_profile_subjects where tutor_profile_id = v_profile_id)
    or v_format_count <> (select count(*) from public.tutor_profile_formats where tutor_profile_id = v_profile_id) then
    raise exception 'All approved subjects and formats must be supplied exactly once' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_settings -> 'subjects') as setting(
      examination public.exam_level, subject text, price_credits integer
    )
    left join public.tutor_profile_subjects target
      on target.tutor_profile_id = v_profile_id and target.examination = setting.examination
      and lower(target.subject) = lower(trim(setting.subject))
    where target.tutor_profile_id is null or setting.price_credits < 1 or setting.price_credits > 100000
  ) or v_subject_count <> (
    select count(distinct (setting.examination, lower(trim(setting.subject))))
    from jsonb_to_recordset(p_settings -> 'subjects') as setting(
      examination public.exam_level, subject text, price_credits integer
    )
  ) then
    raise exception 'Subject prices must match approved subjects and be 1 to 100000 credits' using errcode = '22023';
  end if;
  update public.tutor_profile_subjects target
  set price_credits = setting.price_credits
  from jsonb_to_recordset(p_settings -> 'subjects') as setting(
    examination public.exam_level, subject text, price_credits integer
  )
  where target.tutor_profile_id = v_profile_id
    and target.examination = setting.examination
    and lower(target.subject) = lower(trim(setting.subject));
  if exists (
    select 1
    from jsonb_to_recordset(p_settings -> 'formats') as setting(
      format public.session_format, group_capacity integer, location_note text
    )
    left join public.tutor_profile_formats target
      on target.tutor_profile_id = v_profile_id and target.format = setting.format
    where target.tutor_profile_id is null or setting.group_capacity < 1 or setting.group_capacity > 100
      or length(setting.location_note) > 500
  ) or v_format_count <> (
    select count(distinct setting.format)
    from jsonb_to_recordset(p_settings -> 'formats') as setting(
      format public.session_format, group_capacity integer, location_note text
    )
  ) then
    raise exception 'Format settings are invalid' using errcode = '22023';
  end if;
  update public.tutor_profile_formats target
  set group_capacity = case when target.format = 'online_group' then setting.group_capacity else 1 end,
      location_note = nullif(trim(setting.location_note), '')
  from jsonb_to_recordset(p_settings -> 'formats') as setting(
    format public.session_format, group_capacity integer, location_note text
  )
  where target.tutor_profile_id = v_profile_id and target.format = setting.format;
  update public.tutor_profiles
  set base_price_credits = (
    select min(price_credits) from public.tutor_profile_subjects where tutor_profile_id = v_profile_id
  ) where id = v_profile_id;

  delete from public.availability_rules where tutor_profile_id = v_profile_id;
  insert into public.availability_rules (
    tutor_profile_id, weekday, local_start_time, local_end_time, timezone, format,
    slot_duration_minutes, lead_time_minutes, buffer_before_minutes, buffer_after_minutes,
    effective_from, effective_until
  )
  select v_profile_id, rule.weekday, rule.local_start_time, rule.local_end_time,
    rule.timezone, rule.format, rule.slot_duration_minutes, rule.lead_time_minutes,
    rule.buffer_before_minutes, rule.buffer_after_minutes, rule.effective_from,
    rule.effective_until
  from jsonb_to_recordset(p_rules) as rule(
    weekday smallint, local_start_time time, local_end_time time, timezone text,
    format public.session_format, slot_duration_minutes integer, lead_time_minutes integer,
    buffer_before_minutes integer, buffer_after_minutes integer, effective_from date,
    effective_until date
  )
  join public.tutor_profile_formats allowed
    on allowed.tutor_profile_id = v_profile_id and allowed.format = rule.format;
  if (select count(*) from public.availability_rules where tutor_profile_id = v_profile_id) <> v_rule_count then
    raise exception 'Every rule must use an approved session format' using errcode = '22023';
  end if;

  delete from public.availability_exceptions where tutor_profile_id = v_profile_id and ends_at > now();
  insert into public.availability_exceptions (tutor_profile_id, starts_at, ends_at, available, reason)
  select v_profile_id, exception.starts_at, exception.ends_at,
    coalesce(exception.available, false), nullif(trim(exception.reason), '')
  from jsonb_to_recordset(p_exceptions) as exception(
    starts_at timestamptz, ends_at timestamptz, available boolean, reason text
  );

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_actor_user_id, 'availability.replaced', 'tutor_profile', v_profile_id,
    jsonb_build_object('ruleCount', v_rule_count, 'exceptionCount', v_exception_count, 'subjectCount', v_subject_count, 'formatCount', v_format_count));
  return v_profile_id;
end;
$$;

create function public.create_confirmed_booking(
  p_learner_user_id uuid,
  p_tutor_slug text,
  p_format public.session_format,
  p_examination public.exam_level,
  p_subject text,
  p_starts_at timestamptz,
  p_display_timezone text,
  p_learner_location text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tutor_profile_id uuid;
  v_booking_id uuid;
  v_wallet_id uuid;
  v_escrow_wallet_id uuid;
  v_ledger_transaction_id uuid;
  v_existing_transaction record;
  v_slot record;
  v_balance bigint;
  v_active_count integer;
  v_booking_created boolean := false;
  v_ledger_key text := 'booking:' || p_learner_user_id::text || ':' || trim(p_idempotency_key);
begin
  if length(trim(p_idempotency_key)) < 8 or length(trim(p_idempotency_key)) > 100 then
    raise exception 'Idempotency key must be 8 to 100 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.user_accounts where id = p_learner_user_id and status = 'active') then
    raise exception 'The learner account is not active' using errcode = '42501';
  end if;
  select id, metadata into v_existing_transaction
  from public.ledger_transactions where idempotency_key = v_ledger_key;
  if v_existing_transaction.id is not null then
    if (v_existing_transaction.metadata ->> 'startsAt')::timestamptz is distinct from p_starts_at
      or v_existing_transaction.metadata ->> 'format' is distinct from p_format::text
      or not exists (
        select 1 from public.bookings booking
        join public.tutor_profiles profile on profile.id = booking.tutor_profile_id
        where booking.id = (v_existing_transaction.metadata ->> 'bookingId')::uuid
          and profile.slug = trim(p_tutor_slug)
          and booking.examination = p_examination
          and lower(booking.subject) = lower(trim(p_subject))
      ) then
      raise exception 'Idempotency key was already used for a different booking' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'bookingId', v_existing_transaction.metadata ->> 'bookingId',
      'status', 'confirmed', 'replayed', true
    );
  end if;

  select id into v_tutor_profile_id
  from public.tutor_profiles
  where slug = trim(p_tutor_slug) and status = 'active'
  for update;
  if v_tutor_profile_id is null then
    raise exception 'Tutor is not available for booking' using errcode = '22023';
  end if;

  select * into v_slot
  from public.list_tutor_slots(
    p_tutor_slug, p_starts_at, p_starts_at + interval '1 minute',
    p_format, p_examination, p_subject
  )
  where starts_at = p_starts_at
  limit 1;
  if v_slot.starts_at is null then
    raise exception 'The selected slot is no longer available' using errcode = 'P0001';
  end if;
  if p_format = 'student_place' and length(trim(coalesce(p_learner_location, ''))) not between 5 and 500 then
    raise exception 'A learner address of 5 to 500 characters is required' using errcode = '22023';
  end if;
  if p_format = 'tutor_place' and length(trim(coalesce(v_slot.location_note, ''))) not between 2 and 500 then
    raise exception 'The tutor must publish a location note before this format can be booked' using errcode = '22023';
  end if;

  insert into public.wallet_accounts (owner_user_id) values (p_learner_user_id)
  on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
  returning id into v_wallet_id;
  perform 1 from public.wallet_accounts where id = v_wallet_id for update;
  select coalesce(sum(amount_credits), 0) into v_balance
  from public.ledger_entries where wallet_account_id = v_wallet_id;
  if v_balance < v_slot.price_credits then
    raise exception 'Insufficient credits' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.booking_participants participant
    join public.bookings booking on booking.id = participant.booking_id
    where participant.learner_user_id = p_learner_user_id
      and participant.cancelled_at is null
      and booking.status in ('pending', 'held', 'confirmed')
      and booking.slot && tstzrange(v_slot.starts_at, v_slot.ends_at, '[)')
  ) then
    raise exception 'Learner already has an overlapping active booking' using errcode = '23P01';
  end if;

  if p_format = 'online_group' then
    select booking.id into v_booking_id
    from public.bookings booking
    where booking.tutor_profile_id = v_tutor_profile_id
      and booking.format = p_format
      and booking.examination = p_examination
      and lower(booking.subject) = lower(trim(p_subject))
      and booking.starts_at = v_slot.starts_at
      and booking.ends_at = v_slot.ends_at
      and booking.status in ('pending', 'held', 'confirmed')
    for update limit 1;
  end if;

  if v_booking_id is null then
    insert into public.bookings (
      tutor_profile_id, created_by_user_id, format, examination, subject,
      starts_at, ends_at, timezone, capacity, price_per_learner_credits,
      status, idempotency_key
    ) values (
      v_tutor_profile_id, p_learner_user_id, p_format, p_examination, v_slot.subject,
      v_slot.starts_at, v_slot.ends_at, trim(p_display_timezone), v_slot.capacity,
      v_slot.price_credits, 'confirmed', 'booking:' || p_learner_user_id::text || ':' || trim(p_idempotency_key)
    ) returning id into v_booking_id;
    v_booking_created := true;
    if p_format in ('student_place', 'tutor_place') then
      insert into public.booking_location_details (booking_id, learner_address, tutor_location_note)
      values (
        v_booking_id,
        case when p_format = 'student_place' then trim(p_learner_location) else null end,
        case when p_format = 'tutor_place' then nullif(trim(v_slot.location_note), '') else null end
      );
    end if;
  end if;

  select count(*)::integer into v_active_count
  from public.booking_participants where booking_id = v_booking_id and cancelled_at is null;
  if v_active_count >= v_slot.capacity then
    raise exception 'The selected group is full' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.booking_participants
    where booking_id = v_booking_id and learner_user_id = p_learner_user_id and cancelled_at is null
  ) then
    raise exception 'Learner is already booked into this slot' using errcode = '23505';
  end if;
  insert into public.booking_participants (booking_id, learner_user_id)
  values (v_booking_id, p_learner_user_id);

  if v_booking_created then
    insert into public.booking_status_events (booking_id, actor_user_id, from_status, to_status, reason)
    values (v_booking_id, p_learner_user_id, null, 'confirmed', 'Credits held and slot confirmed');
  end if;

  insert into public.wallet_accounts (system_code) values ('booking_escrow')
  on conflict (system_code) do update set system_code = excluded.system_code
  returning id into v_escrow_wallet_id;
  perform 1 from public.wallet_accounts where id = v_escrow_wallet_id for update;

  insert into public.ledger_transactions (
    kind, idempotency_key, description, booking_id, actor_user_id, metadata
  ) values (
    'hold', v_ledger_key, 'Booking hold · ' || v_slot.subject,
    v_booking_id, p_learner_user_id,
    jsonb_build_object(
      'bookingId', v_booking_id, 'learnerUserId', p_learner_user_id,
      'priceCredits', v_slot.price_credits, 'startsAt', v_slot.starts_at,
      'format', p_format
    )
  ) returning id into v_ledger_transaction_id;
  insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
  values
    (v_ledger_transaction_id, v_wallet_id, -v_slot.price_credits::bigint),
    (v_ledger_transaction_id, v_escrow_wallet_id, v_slot.price_credits::bigint);
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, after_state)
  values (p_learner_user_id, 'booking.confirmed', 'booking', v_booking_id,
    jsonb_build_object('startsAt', v_slot.starts_at, 'priceCredits', v_slot.price_credits, 'format', p_format));

  return jsonb_build_object(
    'bookingId', v_booking_id, 'status', 'confirmed', 'replayed', false,
    'startsAt', v_slot.starts_at, 'endsAt', v_slot.ends_at,
    'priceCredits', v_slot.price_credits, 'remainingCapacity', v_slot.remaining_capacity - 1
  );
end;
$$;

create function public.cancel_booking_with_refund(
  p_actor_user_id uuid,
  p_booking_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_is_tutor boolean;
  v_is_learner boolean;
  v_participant record;
  v_hold record;
  v_wallet_id uuid;
  v_escrow_wallet_id uuid;
  v_refund_transaction_id uuid;
  v_active_count integer;
  v_status public.booking_status;
  v_refund_count integer := 0;
begin
  if length(trim(p_reason)) < 4 or length(trim(p_reason)) > 500 then
    raise exception 'Cancellation reason must be 4 to 500 characters' using errcode = '22023';
  end if;
  if length(trim(p_idempotency_key)) < 8 or length(trim(p_idempotency_key)) > 100 then
    raise exception 'Idempotency key must be 8 to 100 characters' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.ledger_transactions
    where kind = 'refund' and metadata ->> 'cancellationKey' = trim(p_idempotency_key)
      and metadata ->> 'cancellationActorId' = p_actor_user_id::text
      and booking_id = p_booking_id
  ) then
    select status into v_status from public.bookings where id = p_booking_id;
    return jsonb_build_object('bookingId', p_booking_id, 'status', v_status, 'replayed', true);
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0001'; end if;
  if now() >= v_booking.starts_at then
    raise exception 'Bookings cannot be cancelled after the lesson starts' using errcode = 'P0001';
  end if;
  select exists (
    select 1 from public.tutor_profiles profile
    where profile.id = v_booking.tutor_profile_id and profile.tutor_user_id = p_actor_user_id
  ) into v_is_tutor;
  select exists (
    select 1 from public.booking_participants participant
    where participant.booking_id = p_booking_id and participant.learner_user_id = p_actor_user_id
      and participant.cancelled_at is null
  ) into v_is_learner;
  if not v_is_tutor and not v_is_learner then
    raise exception 'You cannot cancel this booking' using errcode = '42501';
  end if;

  insert into public.wallet_accounts (owner_user_id)
  select participant.learner_user_id
  from public.booking_participants participant
  where participant.booking_id = p_booking_id and participant.cancelled_at is null
    and (v_is_tutor or participant.learner_user_id = p_actor_user_id)
  on conflict (owner_user_id) do nothing;
  perform 1
  from public.wallet_accounts wallet
  where wallet.owner_user_id in (
    select participant.learner_user_id
    from public.booking_participants participant
    where participant.booking_id = p_booking_id and participant.cancelled_at is null
      and (v_is_tutor or participant.learner_user_id = p_actor_user_id)
  )
  order by wallet.id
  for update;
  insert into public.wallet_accounts (system_code) values ('booking_escrow')
  on conflict (system_code) do update set system_code = excluded.system_code
  returning id into v_escrow_wallet_id;
  perform 1 from public.wallet_accounts where id = v_escrow_wallet_id for update;

  for v_participant in
    select participant.learner_user_id
    from public.booking_participants participant
    where participant.booking_id = p_booking_id and participant.cancelled_at is null
      and (v_is_tutor or participant.learner_user_id = p_actor_user_id)
    for update
  loop
    select transaction.id, (transaction.metadata ->> 'priceCredits')::integer as price_credits
      into v_hold
    from public.ledger_transactions transaction
    where transaction.booking_id = p_booking_id and transaction.kind = 'hold'
      and transaction.metadata ->> 'learnerUserId' = v_participant.learner_user_id::text
    order by transaction.created_at desc limit 1;
    if v_hold.id is null then raise exception 'Booking hold is missing' using errcode = 'P0001'; end if;

    insert into public.wallet_accounts (owner_user_id) values (v_participant.learner_user_id)
    on conflict (owner_user_id) do update set owner_user_id = excluded.owner_user_id
    returning id into v_wallet_id;
    perform 1 from public.wallet_accounts where id = v_wallet_id for update;
    insert into public.ledger_transactions (
      kind, idempotency_key, description, booking_id, actor_user_id, metadata
    ) values (
      'refund', 'cancel:' || trim(p_idempotency_key) || ':' || v_participant.learner_user_id::text,
      'Booking cancellation refund', p_booking_id, p_actor_user_id,
      jsonb_build_object(
        'bookingId', p_booking_id, 'learnerUserId', v_participant.learner_user_id,
        'priceCredits', v_hold.price_credits, 'holdTransactionId', v_hold.id,
        'cancellationKey', trim(p_idempotency_key), 'cancellationActorId', p_actor_user_id,
        'policy', 'full_refund_before_start'
      )
    ) returning id into v_refund_transaction_id;
    insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
    values
      (v_refund_transaction_id, v_wallet_id, v_hold.price_credits::bigint),
      (v_refund_transaction_id, v_escrow_wallet_id, -v_hold.price_credits::bigint);
    update public.booking_participants set cancelled_at = now()
    where booking_id = p_booking_id and learner_user_id = v_participant.learner_user_id;
    v_refund_count := v_refund_count + 1;
  end loop;

  select count(*)::integer into v_active_count
  from public.booking_participants where booking_id = p_booking_id and cancelled_at is null;
  if v_is_tutor then
    v_status := 'cancelled_by_tutor';
  elsif v_active_count = 0 then
    v_status := 'cancelled_by_learner';
  else
    v_status := v_booking.status;
  end if;
  if v_status <> v_booking.status then
    update public.bookings set status = v_status, cancellation_reason = trim(p_reason), cancelled_at = now()
    where id = p_booking_id;
    insert into public.booking_status_events (booking_id, actor_user_id, from_status, to_status, reason, metadata)
    values (p_booking_id, p_actor_user_id, v_booking.status, v_status, trim(p_reason),
      jsonb_build_object('refundCount', v_refund_count, 'policy', 'full_refund_before_start'));
  end if;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (p_actor_user_id, 'booking.cancelled', 'booking', p_booking_id,
    jsonb_build_object('refundCount', v_refund_count, 'reason', trim(p_reason), 'status', v_status));
  return jsonb_build_object(
    'bookingId', p_booking_id, 'status', v_status, 'replayed', false,
    'refundCount', v_refund_count, 'policy', 'full_refund_before_start'
  );
end;
$$;

alter table public.booking_status_events add column idempotency_key text;
create unique index booking_status_events_idempotency_unique
on public.booking_status_events (idempotency_key) where idempotency_key is not null;

create function public.record_booking_outcome(
  p_actor_user_id uuid,
  p_booking_id uuid,
  p_target_status public.booking_status,
  p_reason text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_is_tutor boolean;
  v_is_learner boolean;
begin
  if length(trim(p_idempotency_key)) < 8 or length(trim(p_idempotency_key)) > 100 then
    raise exception 'Idempotency key must be 8 to 100 characters' using errcode = '22023';
  end if;
  if length(trim(p_reason)) < 4 or length(trim(p_reason)) > 500 then
    raise exception 'Outcome reason must be 4 to 500 characters' using errcode = '22023';
  end if;
  if exists (select 1 from public.booking_status_events where idempotency_key = trim(p_idempotency_key) and booking_id = p_booking_id) then
    select * into v_booking from public.bookings where id = p_booking_id;
    return jsonb_build_object('bookingId', p_booking_id, 'status', v_booking.status, 'replayed', true);
  end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then raise exception 'Booking not found' using errcode = 'P0001'; end if;
  select exists (select 1 from public.tutor_profiles where id = v_booking.tutor_profile_id and tutor_user_id = p_actor_user_id) into v_is_tutor;
  select exists (select 1 from public.booking_participants where booking_id = p_booking_id and learner_user_id = p_actor_user_id and cancelled_at is null) into v_is_learner;

  if p_target_status in ('completed', 'no_show') then
    if not v_is_tutor then raise exception 'Only the booked tutor may record this outcome' using errcode = '42501'; end if;
    if v_booking.status <> 'confirmed' or now() < v_booking.ends_at then
      raise exception 'The lesson outcome cannot be recorded yet' using errcode = 'P0001';
    end if;
  elsif p_target_status = 'disputed' then
    if not v_is_learner then raise exception 'Only an active booking participant may raise a dispute' using errcode = '42501'; end if;
    if v_booking.status not in ('confirmed', 'completed', 'no_show') or now() < v_booking.starts_at
      or now() > v_booking.ends_at + interval '7 days' then
      raise exception 'This booking is outside the dispute window' using errcode = 'P0001';
    end if;
  else
    raise exception 'Unsupported booking outcome' using errcode = '22023';
  end if;

  update public.bookings
  set status = p_target_status,
      completed_at = case when p_target_status = 'completed' then now() else completed_at end
  where id = p_booking_id;
  insert into public.booking_status_events (
    booking_id, actor_user_id, from_status, to_status, reason, idempotency_key
  ) values (
    p_booking_id, p_actor_user_id, v_booking.status, p_target_status,
    trim(p_reason), trim(p_idempotency_key)
  );
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (p_actor_user_id, 'booking.outcome_recorded', 'booking', p_booking_id,
    jsonb_build_object('fromStatus', v_booking.status, 'toStatus', p_target_status, 'reason', trim(p_reason)));
  return jsonb_build_object('bookingId', p_booking_id, 'status', p_target_status, 'replayed', false);
end;
$$;

revoke all on function public.list_tutor_slots(text, timestamptz, timestamptz, public.session_format, public.exam_level, text) from public;
revoke all on function public.replace_tutor_availability(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.create_confirmed_booking(uuid, text, public.session_format, public.exam_level, text, timestamptz, text, text, text) from public;
revoke all on function public.cancel_booking_with_refund(uuid, uuid, text, text) from public;
revoke all on function public.record_booking_outcome(uuid, uuid, public.booking_status, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.list_tutor_slots(text, timestamptz, timestamptz, public.session_format, public.exam_level, text) to service_role';
    execute 'grant execute on function public.replace_tutor_availability(uuid, jsonb, jsonb, jsonb) to service_role';
    execute 'grant execute on function public.create_confirmed_booking(uuid, text, public.session_format, public.exam_level, text, timestamptz, text, text, text) to service_role';
    execute 'grant execute on function public.cancel_booking_with_refund(uuid, uuid, text, text) to service_role';
    execute 'grant execute on function public.record_booking_outcome(uuid, uuid, public.booking_status, text, text) to service_role';
  end if;
end;
$$;
