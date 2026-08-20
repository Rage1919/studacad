# Transactional notifications

Studacad writes notification intents in the same database transactions as booking, Meet, message, tutor-review, deposit, refund, and payout changes. In-app notifications are immediately visible and authoritative. Email delivery is asynchronous, idempotent, and never allowed to fail the source transaction.

## Consent and content policy

- Essential: account/security, tutor-review, booking confirmations and changes, Meet readiness, deposits, refunds, and payouts.
- Optional email: 24-hour and one-hour lesson reminders, and new-message alerts. Users manage these at `/notifications`.
- Marketing and campaigns are out of scope.
- Templates link recipients back to authenticated Studacad pages. They do not contain message bodies, private Meet links, documents, full balances, bank details, or sign-in tokens.

## Delivery worker

Call `POST /api/internal/notifications/deliver` every minute with `Authorization: Bearer $NOTIFICATION_WORKER_SECRET`. The worker claims due rows with a lease and `SKIP LOCKED`, renders versioned templates using the recipient's current name and saved timezone, and calls the configured HTTPS gateway. Provider latency cannot block user transactions.

Failures use exponential backoff and enter a support-visible dead letter after five attempts. Review `/admin/notifications`. Queue replay is accomplished by an audited database repair that clears `dead_lettered_at`, resets attempts, and schedules a new retry; do not create duplicate notification rows.

## Email gateway contract

The gateway receives a bearer-authenticated JSON request containing `from`, `to`, `subject`, `text`, `html`, and `metadata.notificationId/userId`, plus an `Idempotency-Key` header. It returns `{ "id": "provider-message-id" }`.

Configure the gateway to send signed `delivered`, `bounce`, and `complaint` events to `POST /api/webhooks/email` using `x-studacad-signature: sha256=<HMAC>`. Events are deduplicated in `provider_webhook_events`. Bounces and complaints suppress further email to that user while in-app notifications continue.

Production is not ready for email until SPF, DKIM, DMARC, sender-domain verification, webhook signing, and a monitored provider account are in place. Missing credentials cause retry/dead-letter behavior, never simulated success.
