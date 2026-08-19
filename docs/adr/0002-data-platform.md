# ADR 0002: Supabase Postgres and private object storage

- Status: accepted
- Date: 2026-08-19
- Decision owner: Studacad

## Context

Studacad needs durable state for accounts, tutor review, bookings, learning, messages, payments, credits, payouts, referrals, notifications, and audits. The vinext hosting runtime must not depend on a long-lived TCP connection, and private tutor documents must not be published as static assets.

## Decision

Use separate Supabase projects for staging and production:

- PostgreSQL is the authoritative transactional store.
- Supabase's HTTPS data API is the application-runtime connection path.
- The session-pooler PostgreSQL URL is used only by migration, backup, restore, and controlled maintenance tooling.
- Supabase Storage bucket `studacad-private` stores verification documents and protected learning files. It is private by definition; the server issues download URLs for at most 15 minutes after an ownership or admin-role check.
- Supabase Auth is reserved for the next roadmap issue so identity, Postgres, and storage can share one provider without coupling domain code to provider response objects.
- Provider calls remain behind `server/db` and `server/storage` modules.

## Consequences

- Runtime database access uses HTTPS and works in serverless/worker-style hosting.
- Database constraints and transactions remain available for ledger, booking, webhook, and referral correctness.
- A Supabase project and four secrets must be provisioned before a staging deployment can pass startup validation.
- Service-secret clients are server-only and bypass row-level security. All calls through them must perform explicit authorization. User-scoped access and policies are added with authentication in P0-03.
- Moving providers later requires replacing the adapters and operational tooling, not rewriting page components.

## Rejected alternatives

- Browser storage and process-global arrays are not durable, shared, or auditable.
- A database reachable only over direct TCP is a poor fit for the selected runtime.
- Public object buckets do not meet tutor-document or purchased-resource privacy requirements.
- Storing a mutable wallet balance without an append-only ledger cannot support safe retries, refunds, disputes, or reconciliation.
