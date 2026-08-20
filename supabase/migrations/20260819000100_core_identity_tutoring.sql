create type public.account_status as enum ('pending_verification', 'active', 'suspended', 'deletion_requested', 'deleted');
create type public.app_role as enum ('learner', 'tutor', 'admin');
create type public.object_kind as enum ('tutor_identity', 'tutor_qualification', 'learning_resource', 'message_attachment', 'profile_image');
create type public.malware_scan_status as enum ('pending', 'clean', 'rejected', 'failed');
create type public.tutor_application_status as enum ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'suspended', 'withdrawn');
create type public.tutor_profile_status as enum ('draft', 'pending_review', 'active', 'suspended', 'archived');
create type public.session_format as enum ('online_1to1', 'online_group', 'tutor_place', 'student_place');
create type public.exam_level as enum ('PSLE', 'JCE', 'BGCSE');
create type public.booking_status as enum ('pending', 'held', 'confirmed', 'cancelled_by_learner', 'cancelled_by_tutor', 'completed', 'no_show', 'disputed', 'expired', 'refunded');

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.reject_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create table public.user_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_subject uuid not null unique,
  email text not null,
  display_name text not null,
  phone_e164 text,
  timezone text not null default 'Africa/Gaborone',
  status public.account_status not null default 'pending_verification',
  email_verified_at timestamptz,
  export_requested_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_accounts_email_normalized check (email = lower(trim(email))),
  constraint user_accounts_phone_e164 check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

create unique index user_accounts_email_unique on public.user_accounts (lower(email)) where deleted_at is null;
create index user_accounts_status_idx on public.user_accounts (status);
create trigger user_accounts_set_updated_at before update on public.user_accounts
for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.user_accounts(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, role)
);

create index user_roles_active_idx on public.user_roles (role, user_id) where revoked_at is null;

create table public.object_files (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.user_accounts(id) on delete restrict,
  kind public.object_kind not null,
  bucket text not null default 'studacad-private',
  object_key text not null unique,
  original_filename text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  scan_status public.malware_scan_status not null default 'pending',
  scan_provider_reference text,
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint object_files_private_bucket check (bucket = 'studacad-private'),
  constraint object_files_key_is_relative check (object_key !~ '(^/|\.\.)')
);

create index object_files_owner_idx on public.object_files (owner_user_id, created_at desc) where deleted_at is null;
create index object_files_scan_idx on public.object_files (scan_status) where deleted_at is null;

create table public.tutor_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references public.user_accounts(id) on delete restrict,
  status public.tutor_application_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  legal_name text,
  biography text,
  location text,
  timezone text not null default 'Africa/Gaborone',
  base_price_credits integer check (base_price_credits > 0),
  consented_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tutor_applications_applicant_idx on public.tutor_applications (applicant_user_id, created_at desc);
create index tutor_applications_review_queue_idx on public.tutor_applications (status, submitted_at) where status in ('submitted', 'under_review', 'changes_requested');
create trigger tutor_applications_set_updated_at before update on public.tutor_applications
for each row execute function public.set_updated_at();

create table public.tutor_application_subjects (
  application_id uuid not null references public.tutor_applications(id) on delete cascade,
  examination public.exam_level not null,
  subject text not null,
  primary key (application_id, examination, subject)
);

create table public.tutor_application_formats (
  application_id uuid not null references public.tutor_applications(id) on delete cascade,
  format public.session_format not null,
  primary key (application_id, format)
);

create table public.tutor_qualifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.tutor_applications(id) on delete cascade,
  qualification_type text not null,
  institution text not null,
  title text not null,
  awarded_on date,
  expires_on date,
  created_at timestamptz not null default now(),
  constraint tutor_qualifications_dates check (expires_on is null or awarded_on is null or expires_on >= awarded_on)
);

create table public.tutor_application_documents (
  application_id uuid not null references public.tutor_applications(id) on delete cascade,
  file_id uuid not null references public.object_files(id) on delete restrict,
  document_type text not null,
  created_at timestamptz not null default now(),
  primary key (application_id, file_id)
);

create table public.tutor_application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.tutor_applications(id) on delete restrict,
  reviewer_user_id uuid not null references public.user_accounts(id) on delete restrict,
  from_status public.tutor_application_status not null,
  to_status public.tutor_application_status not null,
  internal_note text,
  applicant_message text,
  created_at timestamptz not null default now(),
  constraint tutor_application_reviews_changed check (from_status <> to_status)
);

create index tutor_application_reviews_application_idx on public.tutor_application_reviews (application_id, created_at);
create trigger tutor_application_reviews_immutable before update or delete on public.tutor_application_reviews
for each row execute function public.reject_immutable_mutation();

create table public.tutor_profiles (
  id uuid primary key default gen_random_uuid(),
  tutor_user_id uuid not null unique references public.user_accounts(id) on delete restrict,
  approved_application_id uuid not null unique references public.tutor_applications(id) on delete restrict,
  status public.tutor_profile_status not null default 'draft',
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  headline text not null,
  about text not null,
  location text not null,
  timezone text not null default 'Africa/Gaborone',
  base_price_credits integer not null check (base_price_credits > 0),
  profile_image_file_id uuid references public.object_files(id) on delete set null,
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  completed_booking_count integer not null default 0 check (completed_booking_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tutor_profiles_marketplace_idx on public.tutor_profiles (status, published_at desc) where status = 'active';
create trigger tutor_profiles_set_updated_at before update on public.tutor_profiles
for each row execute function public.set_updated_at();

create table public.tutor_profile_subjects (
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete cascade,
  examination public.exam_level not null,
  subject text not null,
  price_credits integer not null check (price_credits > 0),
  primary key (tutor_profile_id, examination, subject)
);

create table public.tutor_profile_formats (
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete cascade,
  format public.session_format not null,
  location_note text,
  group_capacity integer not null default 1 check (group_capacity between 1 and 100),
  primary key (tutor_profile_id, format)
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  local_start_time time not null,
  local_end_time time not null,
  timezone text not null,
  format public.session_format not null,
  slot_duration_minutes integer not null check (slot_duration_minutes between 15 and 240),
  lead_time_minutes integer not null default 120 check (lead_time_minutes >= 0),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_time_order check (local_end_time > local_start_time),
  constraint availability_rules_date_order check (effective_until is null or effective_until >= effective_from)
);

create index availability_rules_tutor_idx on public.availability_rules (tutor_profile_id, weekday, effective_from);
create trigger availability_rules_set_updated_at before update on public.availability_rules
for each row execute function public.set_updated_at();

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  constraint availability_exceptions_time_order check (ends_at > starts_at)
);

create index availability_exceptions_tutor_idx on public.availability_exceptions (tutor_profile_id, starts_at, ends_at);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete restrict,
  created_by_user_id uuid not null references public.user_accounts(id) on delete restrict,
  format public.session_format not null,
  examination public.exam_level not null,
  subject text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  capacity integer not null default 1 check (capacity between 1 and 100),
  price_per_learner_credits integer not null check (price_per_learner_credits > 0),
  status public.booking_status not null default 'pending',
  idempotency_key text not null unique,
  cancellation_reason text,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slot tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  constraint bookings_time_order check (ends_at > starts_at)
);

create function public.prevent_tutor_booking_overlap()
returns trigger
language plpgsql
as $$
begin
  -- Lock the stable tutor row so concurrent booking transactions serialize per tutor.
  perform 1 from public.tutor_profiles where id = new.tutor_profile_id for update;

  if new.status in ('pending', 'held', 'confirmed') and exists (
    select 1
    from public.bookings existing
    where existing.tutor_profile_id = new.tutor_profile_id
      and existing.id <> new.id
      and existing.status in ('pending', 'held', 'confirmed')
      and existing.slot && tstzrange(new.starts_at, new.ends_at, '[)')
  ) then
    raise exception 'Tutor already has an overlapping active booking'
      using errcode = '23P01', constraint = 'bookings_prevent_tutor_overlap';
  end if;

  return new;
end;
$$;

create trigger bookings_prevent_tutor_overlap
before insert or update of tutor_profile_id, starts_at, ends_at, status on public.bookings
for each row execute function public.prevent_tutor_booking_overlap();

create index bookings_creator_idx on public.bookings (created_by_user_id, starts_at desc);
create index bookings_tutor_idx on public.bookings (tutor_profile_id, starts_at desc);
create index bookings_status_idx on public.bookings (status, starts_at);
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

create table public.booking_participants (
  booking_id uuid not null references public.bookings(id) on delete restrict,
  learner_user_id uuid not null references public.user_accounts(id) on delete restrict,
  joined_at timestamptz not null default now(),
  cancelled_at timestamptz,
  primary key (booking_id, learner_user_id)
);

create index booking_participants_learner_idx on public.booking_participants (learner_user_id, joined_at desc);

create table public.booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  actor_user_id uuid references public.user_accounts(id) on delete restrict,
  from_status public.booking_status,
  to_status public.booking_status not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_status_events_changed check (from_status is null or from_status <> to_status)
);

create index booking_status_events_booking_idx on public.booking_status_events (booking_id, created_at);
create trigger booking_status_events_immutable before update or delete on public.booking_status_events
for each row execute function public.reject_immutable_mutation();

alter table public.user_accounts enable row level security;
alter table public.user_roles enable row level security;
alter table public.object_files enable row level security;
alter table public.tutor_applications enable row level security;
alter table public.tutor_application_subjects enable row level security;
alter table public.tutor_application_formats enable row level security;
alter table public.tutor_qualifications enable row level security;
alter table public.tutor_application_documents enable row level security;
alter table public.tutor_application_reviews enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.tutor_profile_subjects enable row level security;
alter table public.tutor_profile_formats enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_participants enable row level security;
alter table public.booking_status_events enable row level security;
