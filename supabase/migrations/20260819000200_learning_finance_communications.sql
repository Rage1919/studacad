create type public.course_status as enum ('draft', 'published', 'archived');
create type public.purchase_status as enum ('pending', 'completed', 'refunded', 'cancelled');
create type public.progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.conversation_kind as enum ('booking', 'support');
create type public.message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');
create type public.ledger_transaction_kind as enum ('topup', 'purchase', 'reward', 'refund', 'adjustment', 'hold', 'release', 'chargeback', 'earning', 'payout');
create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'cancelled', 'expired', 'partially_refunded', 'refunded', 'disputed');
create type public.refund_status as enum ('requested', 'pending', 'succeeded', 'failed', 'cancelled');
create type public.earning_status as enum ('pending', 'available', 'held', 'paid', 'reversed');
create type public.payout_status as enum ('requested', 'reviewing', 'processing', 'paid', 'failed', 'cancelled');
create type public.referral_reward_status as enum ('pending', 'earned', 'reversed');
create type public.notification_status as enum ('pending', 'sent', 'failed', 'read');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  examination public.exam_level not null,
  subject text not null,
  description text not null,
  instructor_tutor_profile_id uuid references public.tutor_profiles(id) on delete set null,
  price_credits integer not null check (price_credits >= 0),
  status public.course_status not null default 'draft',
  published_at timestamptz,
  created_by_user_id uuid not null references public.user_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_catalog_idx on public.courses (status, examination, subject) where status = 'published';
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  position integer not null check (position >= 0),
  video_url text,
  revision_content text,
  status public.course_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (course_id, position)
);

create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  prompt text not null,
  position integer not null check (position >= 0),
  points integer not null default 1 check (points > 0),
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  label text not null,
  position integer not null check (position >= 0),
  is_correct boolean not null default false,
  unique (question_id, position)
);

create table public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  file_id uuid not null references public.object_files(id) on delete restrict,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references public.user_accounts(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status public.purchase_status not null default 'pending',
  price_credits integer not null check (price_credits >= 0),
  idempotency_key text not null unique,
  purchased_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (learner_user_id, course_id)
);

create index course_purchases_learner_idx on public.course_purchases (learner_user_id, created_at desc);

create table public.lesson_progress (
  learner_user_id uuid not null references public.user_accounts(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  status public.progress_status not null default 'not_started',
  best_score_percent numeric(5,2) check (best_score_percent between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (learner_user_id, lesson_id)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_user_id uuid not null references public.user_accounts(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  score_points integer not null check (score_points >= 0),
  possible_points integer not null check (possible_points > 0 and score_points <= possible_points),
  passed boolean not null,
  idempotency_key text not null unique,
  submitted_at timestamptz not null default now()
);

create index quiz_attempts_learner_idx on public.quiz_attempts (learner_user_id, lesson_id, submitted_at desc);

create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete restrict,
  selected_option_id uuid not null references public.quiz_options(id) on delete restrict,
  awarded_points integer not null check (awarded_points >= 0),
  primary key (attempt_id, question_id)
);

create table public.tutor_favourites (
  learner_user_id uuid not null references public.user_accounts(id) on delete cascade,
  tutor_profile_id uuid not null references public.tutor_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (learner_user_id, tutor_profile_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  booking_id uuid unique references public.bookings(id) on delete restrict,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_booking_link check ((kind = 'booking' and booking_id is not null) or kind = 'support')
);

create trigger conversations_set_updated_at before update on public.conversations
for each row execute function public.set_updated_at();

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx on public.conversation_participants (user_id, joined_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete restrict,
  sender_user_id uuid not null references public.user_accounts(id) on delete restrict,
  body text not null check (length(body) between 1 and 5000),
  status public.message_status not null default 'queued',
  client_idempotency_key text not null,
  provider_message_id text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (sender_user_id, client_idempotency_key)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create unique index messages_provider_unique on public.messages (provider_message_id) where provider_message_id is not null;

create table public.message_attachments (
  message_id uuid not null references public.messages(id) on delete cascade,
  file_id uuid not null references public.object_files(id) on delete restrict,
  primary key (message_id, file_id)
);

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references public.user_accounts(id) on delete restrict,
  system_code text unique,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint wallet_accounts_owner_or_system check ((owner_user_id is null) <> (system_code is null))
);

create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  kind public.ledger_transaction_kind not null,
  idempotency_key text not null unique,
  description text not null,
  booking_id uuid references public.bookings(id) on delete restrict,
  course_purchase_id uuid references public.course_purchases(id) on delete restrict,
  actor_user_id uuid references public.user_accounts(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.ledger_transactions(id) on delete restrict,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete restrict,
  amount_credits bigint not null check (amount_credits <> 0),
  created_at timestamptz not null default now(),
  unique (transaction_id, wallet_account_id)
);

create index ledger_entries_wallet_idx on public.ledger_entries (wallet_account_id, created_at desc);
create trigger ledger_transactions_immutable before update or delete on public.ledger_transactions
for each row execute function public.reject_immutable_mutation();
create trigger ledger_entries_immutable before update or delete on public.ledger_entries
for each row execute function public.reject_immutable_mutation();

create view public.wallet_balances with (security_invoker = true) as
select wallet_account_id, coalesce(sum(amount_credits), 0)::bigint as balance_credits
from public.ledger_entries
group by wallet_account_id;

create table public.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('received', 'processed', 'ignored', 'failed')),
  failure_reason text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_accounts(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  status public.payment_status not null default 'created',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'BWP' check (currency = upper(currency)),
  credits integer not null check (credits > 0),
  checkout_reference text not null unique,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_provider_unique on public.payments (provider, provider_payment_id) where provider_payment_id is not null;
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();

create table public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  provider_refund_id text,
  status public.refund_status not null default 'requested',
  amount_minor bigint not null check (amount_minor > 0),
  credits integer not null check (credits > 0),
  reason text not null,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_refunds_provider_unique on public.payment_refunds (provider_refund_id) where provider_refund_id is not null;
create trigger payment_refunds_set_updated_at before update on public.payment_refunds
for each row execute function public.set_updated_at();

create table public.tutor_earnings (
  id uuid primary key default gen_random_uuid(),
  tutor_user_id uuid not null references public.user_accounts(id) on delete restrict,
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  gross_credits integer not null check (gross_credits > 0),
  platform_fee_credits integer not null check (platform_fee_credits >= 0),
  net_credits integer generated always as (gross_credits - platform_fee_credits) stored,
  status public.earning_status not null default 'pending',
  available_at timestamptz,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint tutor_earnings_fee check (platform_fee_credits <= gross_credits)
);

create index tutor_earnings_tutor_idx on public.tutor_earnings (tutor_user_id, status, created_at desc);

create table public.tutor_payouts (
  id uuid primary key default gen_random_uuid(),
  tutor_user_id uuid not null references public.user_accounts(id) on delete restrict,
  status public.payout_status not null default 'requested',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'BWP' check (currency = upper(currency)),
  provider text not null,
  provider_payout_id text,
  destination_reference text not null,
  idempotency_key text not null unique,
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index tutor_payouts_provider_unique on public.tutor_payouts (provider, provider_payout_id) where provider_payout_id is not null;
create trigger tutor_payouts_set_updated_at before update on public.tutor_payouts
for each row execute function public.set_updated_at();

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.user_accounts(id) on delete restrict,
  code text not null unique check (code ~ '^[A-Z0-9-]{6,32}$'),
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  referred_user_id uuid not null unique references public.user_accounts(id) on delete restrict,
  attributed_at timestamptz not null default now(),
  constraint referral_no_self_reference unique (referral_code_id, referred_user_id)
);

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.referral_attributions(id) on delete restrict,
  qualifying_booking_id uuid not null unique references public.bookings(id) on delete restrict,
  credits integer not null check (credits > 0),
  status public.referral_reward_status not null default 'pending',
  ledger_transaction_id uuid unique references public.ledger_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  earned_at timestamptz,
  reversed_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  category text not null,
  template_key text not null,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'whatsapp')),
  status public.notification_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index notifications_delivery_idx on public.notifications (status, scheduled_for) where status in ('pending', 'failed');
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.user_accounts(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  ip_hash text,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_actor_idx on public.audit_events (actor_user_id, created_at desc);
create trigger audit_events_immutable before update or delete on public.audit_events
for each row execute function public.reject_immutable_mutation();

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.course_resources enable row level security;
alter table public.course_purchases enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.tutor_favourites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.payments enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.tutor_earnings enable row level security;
alter table public.tutor_payouts enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;
