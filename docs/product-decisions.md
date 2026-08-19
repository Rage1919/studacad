# Studacad product decisions

This is the durable record of product defaults and explicit owner decisions made while completing the production roadmap. New defaults are recorded here so implementation can continue without waiting for routine product choices.

| Date | Area | Decision | Status / rationale |
| --- | --- | --- | --- |
| 2026-08-19 | Domain | The canonical production domain is `studacad.com`. | Confirmed by the product owner. DNS cutover and production-domain activation remain deferred until hosting accounts are ready. |
| 2026-08-19 | Payments | Live payment-gateway checkout and webhooks are deferred. | Confirmed by the product owner. Until a gateway is selected, only an administrator may record a verified offline deposit. |
| 2026-08-19 | Credits | One whole Botswana pula deposited equals one credit. There are no bonus tiers. | Confirmed by the product owner. Fractional-pula deposits are rejected so ledger balances remain whole credits. |
| 2026-08-19 | File safety | No malware-scanning provider is currently available. | Confirmed by the product owner. Production tutor-document uploads fail closed; development/test may use the documented test scanner only. |
| 2026-08-19 | Booking cancellation | A learner receives a full credit refund when cancelling any time before the scheduled lesson start. Cancellation is blocked at and after the start time. | Confirmed by the product owner. |
| 2026-08-19 | Course quiz rewards | Passing a course quiz does not mint credits. | Default safety decision. Course progress and best scores are persisted, but financial rewards require a separately approved and abuse-tested policy. |
| 2026-08-19 | Referrals | A referrer earns 50 credits once, after the referred learner completes their first paid lesson. The referred learner receives no credit or discount. | Default safety decision. Completion, real account ownership, first-booking eligibility, self-referral prevention, and ledger idempotency are all enforced server-side. |
| 2026-08-19 | Routine decisions | When a roadmap item needs a reversible, low-risk product choice, use the safest conventional default and record it in this document. Defer external-account setup and choices with material commercial/legal impact. | Standing authorization from the product owner. |
| 2026-08-20 | Abuse limits | Apply conservative application-level limits by route class: 5 sign-in-link requests per 15 minutes, 10 document uploads per hour, 20 verified-deposit requests per minute, 120 other mutations per minute, and 600 reads per minute per network address/process. | Default safety decision. These are a baseline, not a substitute for hosting-provider/WAF limits at final go-live. |
| 2026-08-20 | Browser security | Use a request nonce CSP, deny framing and unused browser capabilities, and enable two-year HSTS with preload only in production. | Default safety decision verified against the built app in Chromium. |
| 2026-08-20 | Google Meet | Create spaces through OAuth for one dedicated organizer, release the join link to booking participants 24 hours before start, retain the same space across reschedules, and revoke Studacad access on cancellation. | Default least-privilege and low-surprise policy. Unknown provider outcomes require support instead of an automatic retry that could create a duplicate space. |
| 2026-08-20 | Messaging | In-app messaging is the durable source of truth. WhatsApp is an optional delivery copy only for an admin-verified private tutor channel; missing credentials or provider failures never discard the in-app message or open a generated phone-number link. | Default privacy and reliability decision. Messages are limited to 2,000 characters and 30 sends per minute per network address/process. |
| 2026-08-20 | Tutor economics | Studacad retains 20% of completed booking credits; the tutor receives 80%, rounded to whole credits. Earnings remain pending for the seven-day dispute window. | Default conservative marketplace policy. Refund rounding is cumulative so the ledger always balances. |
| 2026-08-20 | Tutor payouts | Manual payouts require at least 100 available credits; one tutor credit settles as BWP 1.00. Destinations are verified by an admin and stored only as a masked label plus an external KYC case reference. | Default while a payout provider is deferred. Failed payouts return the reservation and may be retried with an audited new attempt. |

## Deferred owner/external setup

- Point `studacad.com` at the selected production hosting environment and complete the live DNS/TLS verification.
- Select and provision a live payment gateway; gateway checkout and webhook work must remain disabled until credentials and commercial terms are available.
- Select a production malware-scanning provider before enabling tutor-document uploads in production.
- Create the dedicated Google Workspace Meet organizer, complete OAuth consent/verification if Google requires it, and store its Meet credentials in the deployment secret store.
- Provision a WhatsApp Business/Cloud API account, explicitly select a supported Graph API version, configure the signed webhook, and store its credentials before enabling WhatsApp delivery.
