create table public.booking_meetings (
  booking_id uuid primary key references public.bookings(id) on delete restrict,
  provider text not null default 'google_meet' check (provider = 'google_meet'),
  status text not null default 'pending' check (status in ('pending', 'provisioning', 'ready', 'retry_required', 'support_required', 'revoked')),
  provider_space_name text unique,
  meeting_uri text,
  creator_user_id uuid not null references public.user_accounts(id) on delete restrict,
  provider_creator text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  next_retry_at timestamptz,
  requested_at timestamptz not null default now(),
  provisioned_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_meetings_ready_fields check (
    status <> 'ready' or (provider_space_name is not null and meeting_uri is not null and provisioned_at is not null)
  ),
  constraint booking_meetings_uri check (meeting_uri is null or meeting_uri ~ '^https://meet\.google\.com/[a-z-]+$')
);

create index booking_meetings_work_idx on public.booking_meetings (status, next_retry_at, requested_at)
where status in ('pending', 'retry_required');

create trigger booking_meetings_set_updated_at before update on public.booking_meetings
for each row execute function public.set_updated_at();

alter table public.booking_meetings enable row level security;

create function public.sync_booking_meeting_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.format in ('online_1to1', 'online_group') and new.status = 'confirmed' then
    insert into public.booking_meetings (booking_id, creator_user_id)
    values (new.id, new.created_by_user_id)
    on conflict (booking_id) do update set
      status = case
        when booking_meetings.status = 'revoked' then 'pending'
        else booking_meetings.status
      end,
      revoked_at = null,
      next_retry_at = case when booking_meetings.status = 'revoked' then null else booking_meetings.next_retry_at end;
  elsif new.format in ('online_1to1', 'online_group') then
    update public.booking_meetings
    set status = 'revoked', revoked_at = coalesce(revoked_at, now()), next_retry_at = null
    where booking_id = new.id and status <> 'revoked';
  end if;
  return new;
end;
$$;

create trigger bookings_sync_meeting_lifecycle
after insert or update of format, status, starts_at, ends_at on public.bookings
for each row execute function public.sync_booking_meeting_lifecycle();

insert into public.booking_meetings (booking_id, creator_user_id)
select booking.id, booking.created_by_user_id
from public.bookings booking
where booking.format in ('online_1to1', 'online_group') and booking.status = 'confirmed'
on conflict (booking_id) do nothing;

revoke all on table public.booking_meetings from public;
revoke all on function public.sync_booking_meeting_lifecycle() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update on public.booking_meetings to service_role';
  end if;
end;
$$;
