# ADR 0001: Use OpenAI Sites for the canonical server runtime

- Status: Accepted for the pre-launch production candidate
- Date: 2026-08-19
- Tracks: GitHub issue #14

## Context

Studacad is a Next.js 16.3 application built with vinext. It contains Route Handlers for Google Meet, messages, referrals, and WhatsApp, with database, authentication, payment, booking, and notification handlers planned next. GitHub Pages builds by moving `app/api` out of the application and enabling `output: "export"`, so it cannot be the transactional service.

The repository is already linked through `.openai/hosting.json` to an active OpenAI Sites project with saved, rollback-capable versions and a server runtime.

## Decision

OpenAI Sites is the canonical runtime for the current production candidate. The existing project is reused; no second production project is created. It remains private while P0/P1 work is incomplete, then moves to public access only after the production-readiness gate.

GitHub Pages remains a clearly labelled, static UI preview. It must not be used to validate Route Handlers, authentication, persistence, payments, bookings, webhooks, messages, or other server behavior.

The application validates its runtime environment during server startup and exposes a minimal, uncached `/api/health` endpoint. Runtime configuration belongs in the Sites environment-variable store, not the Git repository.

## Consequences

- Server features are developed and verified against a server-capable deployment.
- Saved Sites versions provide a rollback target.
- Preview and production-candidate behavior are intentionally different; the Pages workflow removes server routes.
- A custom production hostname and DNS ownership are still required before public launch.
- If later requirements exceed the runtime’s database, job, region, or compliance capabilities, replacing the provider requires a new ADR and a rehearsed migration; application code should remain provider-light.
