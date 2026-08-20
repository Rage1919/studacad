# Recovery, provider outage, credential rotation, and queue replay drills

Run every drill against production-like staging with test accounts. Record candidate SHA, operator, start/end, target RTO/RPO, actual duration/data point, request IDs, evidence, defects, and retest. Never create real charges, payouts, messages, or identity records.

## Backup restore and database recovery

1. Record the encrypted backup ID, source release/migration, backup completion time, and expected recovery point.
2. Restore to a new private non-production project. Never overwrite production for a drill.
3. Point a staging maintenance environment at the restored database and run migrations twice.
4. Set `STUDACAD_ENV=staging` and `STUDACAD_RESTORE_DRILL_ACK=restored-non-production`, then run `pnpm db:verify-restore`. Retain its immutable output.
5. Verify representative learner/tutor/admin ownership, storage authorization, row counts, bookings, entitlements, audit history, ledger totals, and payout clearing.
6. Time secret switch and application recovery; keep the source project read-only until the recovery window closes.

Initial objectives are RPO ≤ 24 hours and RTO ≤ 4 hours. They are provisional until one measured restore passes. Schema rollback is forward-only: pause deployment, preserve the backup, add a corrective migration for non-destructive defects, or restore into a new project for corrupting/destructive changes. Never rewrite applied migrations or append-only financial/audit rows.

## Provider and platform outages

- Authentication/database/storage: close affected mutations, preserve request IDs, show unavailable states, restore configuration/service, and verify tenant isolation before reopening. Scanner outage keeps tutor uploads closed.
- Meet: bookings and credits remain authoritative; retry only classified safe failures. Unknown space-create outcomes require organizer-account reconciliation before reset.
- WhatsApp/email: in-app records remain authoritative. Stop workers if failure volume grows, preserve queued rows, and never simulate delivery.
- Payment gateway: it is disabled by product decision. A later gateway outage runbook is required before enabling it. Verified offline deposits stop if reconciliation is not green.
- Hosting: roll back to the last immutable compatible version; forward-fix database state when an older app is schema-incompatible.

## Credential rotation

Inventory the credential and dependants, create a replacement with least privilege, update staging, validate one success and one invalid-old-secret denial, update production during an approved window, revoke the old credential, check logs for misuse, and record provider reference/date/owners without the value. Rotate immediately after suspected exposure or access changes. For signing secrets that require overlap, document the bounded dual-key window; application secrets in this repository do not assume indefinite overlap.

## Queue replay and webhook recovery

Stop the affected worker before repair. Classify provider outcome using provider IDs/hashes and audit events. Requeue only rows known not to have completed; retain the original idempotency key and incremented attempt/audit history. Notification dead letters require an audited repair of `dead_lettered_at`, attempts, and next retry; Meet/WhatsApp unknown outcomes require manual reconciliation and must not be blindly replayed. Signed webhooks are replayed with the original provider event ID in test mode and must produce zero duplicate financial/message effects.

After every drill, call the private operations endpoint. Do not close the incident until ledger imbalance, clearing variance, failed webhooks, dead letters, and support-required provider rows are zero or linked to an accepted case.
