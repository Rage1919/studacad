# Wallet and verified deposits

## Current product decision

- Online payment-gateway checkout and provider webhooks are deferred.
- Studacad issues exactly **1 credit for each whole BWP received**. There are no bonus-credit packages.
- Browser state never creates, debits, or rewards credits. The API and immutable database ledger are authoritative.

## Temporary verified-deposit workflow

An authenticated administrator can open `/admin/wallet` after independently confirming a bank or cash deposit. They enter the learner's account email, the whole-BWP amount, the external deposit reference, and a stable idempotency key. A confirmation prompt repeats the amount and recipient before submission.

The database procedure rechecks administrator authority and learner status, creates or reuses the learner wallet, records a paid offline-deposit record, posts equal-and-opposite ledger entries, links the payment record, and appends an audit event in one transaction. Replaying identical details with the same idempotency key returns the original transaction; changing any financial detail is rejected.

This workflow records money already received. It does not move money and must not be used before the external reference is verified.

## Reconciliation

For each verified deposit, operations should be able to match:

1. The external bank/cash reference.
2. The `payments` row with provider `verified_offline_deposit`.
3. The linked immutable `ledger_transactions` record.
4. The learner and system entries, whose credit sum is zero.
5. The `wallet.verified_deposit_recorded` audit event and administrator.

## Deferred provider work

Before enabling online deposits, select a Botswana-compatible provider and implement server-created checkout, signed idempotent webhooks, refunds, disputes, chargebacks, receipts, and staging reconciliation. Provider callbacks must invoke the same ledger invariants; the browser must never decide how many credits are issued.

## Rollback

Do not edit or delete ledger entries. If an operational deposit was posted incorrectly, add a separately authorized compensating adjustment with its own reference and audit event. Application rollback may disable the admin endpoint and UI, but the migration and financial history must remain intact.
