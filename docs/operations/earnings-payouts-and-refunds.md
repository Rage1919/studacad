# Earnings, payouts, and booking refunds

## Economic policy

- Studacad retains 20% of the gross booking credits, rounded to the nearest whole credit. The remaining 80% is the tutor's net earning.
- A completed or tutor-recorded no-show lesson creates a pending earning. Release occurs after the booking's seven-day dispute window. A dispute holds release.
- One whole credit is BWP 1.00 for the audited manual payout workflow. The minimum request is 100 credits.
- A pre-start cancellation remains a full learner refund from booking escrow. After outcome, an administrator may record a partial or full refund with a reason and stable idempotency key.
- Pre-release refunds reduce escrow and the future earning. Post-release refunds create balanced negative tutor/platform adjustments. A tutor may therefore have a negative economic balance after a payout; later earnings repay that balance before another payout is possible.

## Scheduled release

Call `POST /api/internal/earnings/release` on a five-minute schedule with `Authorization: Bearer $EARNINGS_WORKER_SECRET`. The database locks and claims due rows, so concurrent workers and retries are safe. Monitor the returned release count and `tutor_earning.released` audit events.

## Manual payout procedure

1. Verify identity and payout ownership outside Studacad using the approved KYC procedure.
2. In `/admin/payouts`, store only a masked destination (for example `Bank •••• 1234`) and the external case reference. Never paste an account number, identity document, or KYC payload.
3. The tutor requests a payout. Credits move atomically to payout clearing.
4. A different authorized reviewer should move the request through reviewing and processing.
5. After the external transfer succeeds, record its settlement reference and mark paid. If it fails, record the reason; the reservation is returned automatically. Retry creates another ledger-backed attempt.
6. Confirm the clearing reconciliation banner is green. Any mismatch is a release blocker and must be investigated against immutable payout events and ledger transactions.

Future provider webhooks must be signature-verified and deduplicated through `provider_webhook_events`; provider events must call the same transition function. Never update balances or payout rows directly.

## Refund procedure

Use the booking ID, learner account ID, whole-credit amount, and a useful support reason. Duplicate requests with the same idempotency key return the original refund. The database rejects over-refunds and nonparticipants. Refund and payout ledger entries must sum to zero.
