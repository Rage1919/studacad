# Core platform security and test baseline

## Request controls

The root proxy gives every response a correlation ID, CSP nonce, anti-framing/content-sniffing headers, a strict referrer policy, and a restrictive permissions policy. Production also receives two-year HSTS with subdomains/preload. Anonymous requests do not contact the authentication provider; session refresh runs only when an authentication cookie is present.

API requests are limited by route class and rejected before route execution when the declared body size exceeds the route limit. JSON requests default to 128 KiB, the WhatsApp webhook allows 1 MiB, and verified tutor-document multipart uploads allow 12 MiB before their file-type/signature/scan validation. Rate-limit responses use `429` and `Retry-After`; oversized bodies use `413`.

Application-level rate counters are process-local and intentionally contain no personal data. The final production gate must pair them with equivalent hosting-provider/WAF limits so limits remain effective across regions, restarts, and horizontal scaling.

## Authorization and integrity

- User-triggered mutations enforce exact same-origin CSRF checks.
- Roles and ownership are checked server-side; browser state never grants access.
- Booking, deposit, course-purchase, and referral financial effects are idempotent and balanced in the append-only ledger.
- Admin and financial requests append correlated audit events with actor, target, time, and `X-Request-Id`.
- Private files require explicit ownership/admin or completed-course authorization and short-lived signed URLs.
- Deployed WhatsApp webhooks fail closed without a configured secret, verify constant-time HMAC signatures, hash payloads, and reject provider-event replay.
- Structured-log redaction treats credentials, sessions, contact information, addresses, messages, bodies, and payloads as sensitive.

## Automated test layers

| Layer | Coverage |
| --- | --- |
| Policy/unit | Session validity, role denial, safe redirects, CSRF, cookie policy, request/body/rate policies, log redaction, webhook signatures, booking/content/upload/wallet validation. |
| Database integration | Empty-schema migration, repeat migration, tutor application/review, verified deposit, concurrency-safe booking, full cancellation refund, ledger invariants, course purchase, server quiz scoring, cross-account persistence records, self-referral/replay denial, referral reward. |
| Built-app browser | Security headers/CSP, neutral email-link sign-in UX, pre-route body rejection, and sign-in abuse throttling. |
| CI supply chain | Frozen lockfile, production dependency audit, dependency review, CodeQL, secret scan, weekly dependency updates, type/lint/format/build gates. |

Provider calls use test doubles or fixed local fixtures in CI. Staging must still exercise real configured authentication, storage, Meet, messaging, and later payment/payout providers before launch; the final readiness issue owns that evidence.

## Local verification

Run `pnpm check`, then `pnpm exec playwright install chromium` once and `pnpm test:e2e`. The browser suite starts the built server and requires the test environment variables used by CI.
