alter table public.conversations add column tutor_profile_id uuid references public.tutor_profiles(id) on delete restrict;
alter table public.conversations add column created_by_user_id uuid references public.user_accounts(id) on delete restrict;
alter table public.conversations drop constraint conversations_booking_link;
alter table public.conversations add constraint conversations_context_check check (
  (kind = 'booking' and booking_id is not null)
  or (kind = 'support' and booking_id is null)
);
create unique index conversations_learner_tutor_unique
on public.conversations (created_by_user_id, tutor_profile_id)
where tutor_profile_id is not null and created_by_user_id is not null;

alter table public.messages add column channel text not null default 'in_app'
check (channel in ('in_app', 'whatsapp'));
alter table public.messages add column direction text not null default 'internal'
check (direction in ('internal', 'outbound', 'inbound'));
alter table public.messages add column moderation_status text not null default 'visible'
check (moderation_status in ('visible', 'reported', 'removed'));

create table public.tutor_messaging_channels (
  id uuid primary key default gen_random_uuid(),
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete restrict,
  provider text not null check (provider = 'whatsapp'),
  recipient_e164 text not null check (recipient_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status text not null default 'pending' check (status in ('pending', 'verified', 'disabled')),
  verified_by_user_id uuid references public.user_accounts(id) on delete restrict,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tutor_profile_id, provider),
  unique (provider, recipient_e164),
  constraint tutor_messaging_channel_verification check (
    status <> 'verified' or (verified_by_user_id is not null and verified_at is not null)
  )
);
create trigger tutor_messaging_channels_set_updated_at before update on public.tutor_messaging_channels
for each row execute function public.set_updated_at();

create table public.message_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete restrict,
  channel_id uuid not null references public.tutor_messaging_channels(id) on delete restrict,
  provider text not null check (provider = 'whatsapp'),
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'delivered', 'read', 'retry_required', 'failed', 'support_required')),
  provider_message_id text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  next_retry_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, provider)
);
create unique index message_deliveries_provider_message_unique on public.message_deliveries (provider, provider_message_id)
where provider_message_id is not null;
create index message_deliveries_work_idx on public.message_deliveries (status, next_retry_at, created_at)
where status in ('queued', 'retry_required');
create trigger message_deliveries_set_updated_at before update on public.message_deliveries
for each row execute function public.set_updated_at();

create table public.contact_blocks (
  blocker_user_id uuid not null references public.user_accounts(id) on delete cascade,
  blocked_user_id uuid not null references public.user_accounts(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id, conversation_id),
  check (blocker_user_id <> blocked_user_id)
);

create table public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete restrict,
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  reporter_user_id uuid not null references public.user_accounts(id) on delete restrict,
  reason text not null check (length(reason) between 5 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by_user_id uuid references public.user_accounts(id) on delete restrict,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (message_id, reporter_user_id)
);
create index message_reports_review_idx on public.message_reports (status, created_at);
create trigger message_reports_set_updated_at before update on public.message_reports
for each row execute function public.set_updated_at();

alter table public.tutor_messaging_channels enable row level security;
alter table public.message_deliveries enable row level security;
alter table public.contact_blocks enable row level security;
alter table public.message_reports enable row level security;

create function public.start_tutor_conversation(p_actor_user_id uuid, p_tutor_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.tutor_profiles%rowtype;
  v_conversation_id uuid;
begin
  select * into v_profile from public.tutor_profiles
  where slug = lower(trim(p_tutor_slug)) and status = 'active';
  if v_profile.id is null then raise exception 'Tutor not found' using errcode = 'P0001'; end if;
  if v_profile.tutor_user_id = p_actor_user_id then raise exception 'You cannot message yourself' using errcode = '22023'; end if;
  if not exists (select 1 from public.user_accounts where id = p_actor_user_id and status = 'active') then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select id into v_conversation_id from public.conversations
  where created_by_user_id = p_actor_user_id and tutor_profile_id = v_profile.id;
  if v_conversation_id is null then
    insert into public.conversations (kind, tutor_profile_id, created_by_user_id, subject)
    values ('support', v_profile.id, p_actor_user_id, 'Tutor enquiry')
    on conflict (created_by_user_id, tutor_profile_id) where tutor_profile_id is not null and created_by_user_id is not null
    do update set updated_at = public.conversations.updated_at
    returning id into v_conversation_id;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conversation_id, p_actor_user_id), (v_conversation_id, v_profile.tutor_user_id)
    on conflict do nothing;
  end if;
  return v_conversation_id;
end;
$$;

create function public.send_conversation_message(
  p_actor_user_id uuid,
  p_conversation_id uuid,
  p_body text,
  p_client_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_message public.messages%rowtype;
  v_other_user_id uuid;
  v_channel_id uuid;
begin
  if length(trim(p_body)) < 1 or length(trim(p_body)) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters' using errcode = '22023';
  end if;
  if p_client_idempotency_key !~ '^[A-Za-z0-9:_-]{8,100}$' then
    raise exception 'Invalid message idempotency key' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = p_actor_user_id and left_at is null
  ) then raise exception 'Conversation not found' using errcode = 'P0001'; end if;

  select user_id into v_other_user_id from public.conversation_participants
  where conversation_id = p_conversation_id and user_id <> p_actor_user_id and left_at is null
  order by joined_at limit 1;
  if v_other_user_id is null then raise exception 'Conversation is unavailable' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.contact_blocks where conversation_id = p_conversation_id
    and ((blocker_user_id = p_actor_user_id and blocked_user_id = v_other_user_id)
      or (blocker_user_id = v_other_user_id and blocked_user_id = p_actor_user_id))
  ) then raise exception 'Messaging is blocked for this conversation' using errcode = '42501'; end if;

  select * into v_message from public.messages
  where sender_user_id = p_actor_user_id and client_idempotency_key = trim(p_client_idempotency_key);
  if v_message.id is not null then
    if v_message.conversation_id <> p_conversation_id or v_message.body <> trim(p_body) then
      raise exception 'Message idempotency key was already used' using errcode = '23505';
    end if;
    return v_message.id;
  end if;

  insert into public.messages (conversation_id, sender_user_id, body, status, client_idempotency_key, channel, direction)
  values (p_conversation_id, p_actor_user_id, trim(p_body), 'sent', trim(p_client_idempotency_key), 'in_app', 'internal')
  returning * into v_message;

  select channel.id into v_channel_id
  from public.conversations conversation
  join public.tutor_profiles profile on profile.id = conversation.tutor_profile_id
  join public.tutor_messaging_channels channel on channel.tutor_profile_id = profile.id and channel.provider = 'whatsapp' and channel.status = 'verified'
  where conversation.id = p_conversation_id and profile.tutor_user_id = v_other_user_id;
  if v_channel_id is not null then
    insert into public.message_deliveries (message_id, channel_id, provider)
    values (v_message.id, v_channel_id, 'whatsapp') on conflict do nothing;
  end if;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return v_message.id;
end;
$$;

revoke all on table public.tutor_messaging_channels, public.message_deliveries, public.contact_blocks, public.message_reports from public;
revoke all on function public.start_tutor_conversation(uuid, text) from public;
revoke all on function public.send_conversation_message(uuid, uuid, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update on public.tutor_messaging_channels, public.message_deliveries, public.contact_blocks, public.message_reports to service_role';
    execute 'grant execute on function public.start_tutor_conversation(uuid, text) to service_role';
    execute 'grant execute on function public.send_conversation_message(uuid, uuid, text, text) to service_role';
  end if;
end;
$$;
