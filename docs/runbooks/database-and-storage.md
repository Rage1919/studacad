# Database and storage runbook

## Environments and ownership

Create separate Supabase projects for staging and production. Never point local development or CI at production. Platform access, database credentials, backups, and restores are owned by the Studacad technical owner; payment reconciliation remains a separate operational responsibility.

Required runtime values are documented in `.env.example`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (secret; server only)
- `SUPABASE_PRIVATE_BUCKET=studacad-private`
- `DATABASE_URL` (secret; maintenance tooling only)

Use the session pooler connection string for `DATABASE_URL` unless a controlled maintenance task explicitly requires a direct connection. The migration runner opens one connection, takes a global advisory lock, verifies checksums, and applies each migration in its own transaction. Application traffic uses the HTTPS client and does not create a TCP pool.

## Apply migrations

1. Back up the target database and record the backup identifier.
2. Set `STUDACAD_ENV` and `DATABASE_URL` for the intended target.
3. Run `pnpm db:migrate` from the reviewed release commit.
4. Run it a second time; it must report no new migrations.
5. Verify the release health endpoint and the critical account, booking, and wallet reads.

Never edit an applied migration. Add a later forward migration. The runner rejects a changed checksum.

## Local/demo seed safety

`pnpm db:seed:development` refuses to run unless `STUDACAD_ENV` is exactly `development` or `test`. Production startup never runs a seed automatically. Seed identities use the reserved `example.test` domain and must not be copied to production.

## Transaction boundaries

The following operations must execute as one database transaction or one reviewed PostgreSQL function/RPC:

- wallet debit/credit and its complete ledger lines;
- payment or webhook event idempotency and credit issuance;
- booking slot lock, wallet hold/debit, participant creation, and status event;
- cancellation/refund and linked ledger entries;
- referral qualification and reward issuance;
- tutor earning release and payout reservation.

Do not split these operations across independent browser requests.

## Private storage

The `studacad-private` bucket is created as non-public with a 10 MiB object limit and a restricted MIME-type list. No direct publishable-client storage policy is installed by P0-02. The server:

1. stores a random relative object key and checksum in `object_files`;
2. keeps new uploads unavailable while malware scanning is pending;
3. checks that the caller owns the record or has an active admin role;
4. issues a signed download URL for no more than 15 minutes;
5. appends an audit event for every signed download URL.

Tutor onboarding adds upload validation and scanning before documents are accepted.

## Backups and restore

- Retain encrypted daily logical backups for at least 30 days in a separate, access-controlled location.
- Keep the provider-managed backups enabled for the production plan.
- Test a restore into a non-production project at least quarterly and before a high-risk migration.
- Record backup time, source release SHA, migration version, restore duration, row-count checks, and tester.

Restore procedure:

1. Suspend writes or put the application into maintenance mode.
2. Create a new non-public Supabase project in the approved region.
3. Restore the selected logical backup using the provider's documented restore tooling.
4. Run `pnpm db:migrate` from the release being restored.
5. Set `STUDACAD_RESTORE_DRILL_ACK=restored-non-production` and run `pnpm db:verify-restore`; retain its timed output.
6. Verify migration history, row counts, foreign keys, ledger totals, private bucket access, and critical smoke tests.
7. Change staging secrets first, validate, then switch production secrets.
8. Keep the old project read-only until the recovery window closes.

## Rollback

Schema rollback is forward-only. For a faulty but non-destructive change, deploy a corrective migration. For destructive or corrupting changes, restore the pre-migration backup into a new project and switch secrets after validation. Never delete migration history or manually rewrite append-only financial/audit records.
