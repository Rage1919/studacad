# Go-live and rollback plan

## Ownership and coverage

The product owner (Rage1919) makes the final go/no-go decision for the exact signed candidate. Before scheduling launch, assign reachable named people to release command, technical operations, database recovery, financial reconciliation, security/privacy, provider escalation, and learner/tutor support. Record primary/backup contacts and Google, Supabase, hosting, email, WhatsApp, scanner, and DNS registrar case paths in a private operations system—not this repository. First-launch support coverage is continuous for the deployment window plus four hours, then daily monitored coverage until the first stable seven days complete.

## Go/no-go

GO requires green candidate CI/security checks; completed signatures and evidence; production secrets and providers; DNS/TLS; database backup and compatible migrations; `pnpm readiness:staging`; zero critical/high defects and launch-blocker risks; healthy private snapshot; tested alerts; support coverage; and a known-good immutable rollback version. `docs/release/readiness-status.json` must be reviewed and changed to `GO` only from attached evidence—never to make the command pass.

The current decision is **NO-GO**.

## Feature closure and kill switches

The safest kill switch is to stop the relevant scheduler/internal worker credential or deploy the last known-good immutable application version. Scanner absence already closes tutor uploads; missing Meet/WhatsApp/email credentials fail their provider action without simulated success; online payment checkout is not implemented and stays unavailable. For money-integrity, authorization, database, or tenant-isolation incidents, close all affected mutations or place the deployment behind maintenance access rather than selectively hiding UI. Never repair balances or audit history by direct update.

## Launch sequence

1. Freeze the candidate and evidence; record commit, deployment artifact/version, database migration, backup, operators, support window, provider status, and rollback version.
2. Confirm DNS TTL/certificates, environment preflight, provider test, alert routing, queue state, ledger/clearing reconciliation, and database capacity.
3. Apply reviewed migrations once, run again for no-op, deploy the immutable artifact, and verify public/private health and release SHA.
4. Run signed learner/tutor/admin smoke journeys without real customer data; open access gradually only if alerts and SLOs remain healthy.
5. Watch authentication, booking, ledger, message, Meet, notification, webhook, payout, support, database, and security signals through the coverage window.

## Rollback decision and validation

Immediately stop rollout for a private-data leak, authorization bypass, unbalanced/duplicate money effect, oversold private slot, migration corruption, unavailable rollback, or sustained critical-path error. Roll back the application for compatible code/config regressions. Use a forward migration or restored new database for incompatible/destructive schema state. Rotate credentials for exposure; pause/reconcile providers for unknown outcomes. After recovery, verify health/SHA, tenant isolation, ledger and payout clearing, queues, provider events, affected journey, and audit evidence before reopening. Preserve the incident timeline and assign corrective action.
