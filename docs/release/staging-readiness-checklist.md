# Production-like staging readiness checklist

This checklist is evidence, not a promise. Complete it against one immutable candidate deployed to private production-like staging. Do not use real customer money, messages, identity documents, or provider destinations.

## Candidate and signatures

| Field                                    | Required value             |
| ---------------------------------------- | -------------------------- |
| Release commit and deployment version    | _Unfilled_                 |
| Staging URL and deployment timestamp     | _Unfilled_                 |
| Database migration version and backup ID | _Unfilled_                 |
| Test provider account references         | _Unfilled; no credentials_ |
| Release operator and date                | _Unfilled_                 |
| Learner tester signature/date            | _Unfilled_                 |
| Tutor tester signature/date              | _Unfilled_                 |
| Administrator tester signature/date      | _Unfilled_                 |
| Security/policy reviewer signature/date  | _Unfilled_                 |
| Product owner go/no-go signature/date    | _Unfilled_                 |

Any unfilled signature keeps the decision at **NO-GO**.

## Automated gate

- [ ] Candidate commit has green GitHub CI, CodeQL, dependency audit, and secret scan.
- [ ] `pnpm env:check`, `pnpm db:env:check`, `pnpm db:migrate` twice, `pnpm typecheck`, `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, and `pnpm readiness:check` pass against the candidate.
- [ ] `/api/health` returns the candidate SHA; the authenticated `/api/internal/operations` snapshot is `ok` with no ledger, queue, webhook, meeting, payout, or reconciliation alert.
- [ ] Static preview build remains fail-closed and contains no account or provider fixture.

Attach command, timestamp, exit code, and immutable log/artifact link for every line.

## Signed user and operational journeys

For each row record test identities, start/end time, request/case/booking reference, expected result, actual result, screenshot or redacted log link, defect link, retest result, and tester initials.

| Journey                  | Required staging result                                                                                                                                                   | Pass/evidence                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Learner account          | Secure email link, policy acceptance, profile update, export request, sign-out, neutral invalid-account response                                                          | _Unfilled_                            |
| Tutor application        | Draft and validation work; safe document is scanned; unsafe and scanner-outage uploads fail closed; admin approval alone publishes profile                                | _Blocked: production scanner absent_  |
| Tutor discovery          | Only approved active profile appears; filters, stable slug, honest empty/not-found states, favourite and report routes work                                               | _Unfilled_                            |
| Verified offline deposit | Admin records BWP 1.00 as exactly one credit with stable reference; replay has one financial effect; non-admin is denied                                                  | _Unfilled_                            |
| Online gateway           | Remains visibly unavailable; no checkout or webhook success is implied                                                                                                    | _Accepted feature deferral_           |
| Booking/concurrency      | Ten attempts compete for one private slot; exactly one confirms and one ledger hold occurs; remaining users get a conflict without debit                                  | _Unfilled_                            |
| Cancellation/refund      | Cancellation one instant before start returns full credits; cancellation at/after start is rejected; replay has one effect                                                | _Unfilled_                            |
| Meet                     | Confirmed online booking creates one test space, releases link 24 hours before start, keeps it on reschedule, revokes access on cancellation, and handles provider outage | _Blocked: Google test account absent_ |
| Messaging                | Conversation isolation, 2,000-character limit, idempotent send, block/report, optional verified WhatsApp copy, signed replay-safe webhook, and provider outage            | _WhatsApp portion blocked_            |
| Tutor earning/payout     | 80/20 split, seven-day hold, dispute, minimum 100-credit manual payout, dual review, failure return, retry, settlement, refund, and green clearing reconciliation         | _Unfilled_                            |
| Notifications            | In-app source of truth, preferences, 24-hour/one-hour reminders, signed delivery events, suppression, retry, dead letter, and replay                                      | _Email portion blocked_               |
| Support/safety           | Standard and urgent case references, private replies, assignment, escalation, report linking, retention, and audit history                                                | _Unfilled_                            |
| Course/LMS               | Published-only catalog, atomic purchase, entitlement, signed resource, server-scored quiz, persistent progress, no credit minting                                         | _Unfilled_                            |
| Account deletion         | Request blocks the documented lifecycle; export/retention/legal holds and final anonymization/deletion are verified without orphaning financial/audit records             | _Unfilled_                            |

## Operational, recovery, capacity, and review evidence

- [ ] Alert routing and dashboards in `docs/operations/observability-and-slos.md` are live and send a test page to primary and backup owners.
- [ ] A backup restores into a new non-production project; `pnpm db:verify-restore` passes and duration/RTO/RPO are recorded.
- [ ] Migration forward-fix, application rollback, database outage/recovery, provider outage, credential rotation, queue replay, webhook replay, and unknown-outcome procedures are timed and signed.
- [ ] Every load scenario in `docs/release/launch-capacity-and-load-plan.md` meets the approved capacity contract without tenant leaks, duplicate financial effects, overselling, or queue-age breach.
- [ ] Final security/privacy review is signed; dependency findings and every critical/high defect have a closed or owner-approved disposition.
- [ ] Legal, privacy, safeguarding, and accessibility attestations are recorded truthfully in the policy review register.

## Decision

The release is **GO** only when every non-deferred row passes, every accepted deferral is reflected by a disabled/unavailable feature, no critical/high defect or launch-blocker risk remains, monitoring and support coverage are active, rollback is rehearsed, and the product owner signs the exact candidate. Otherwise it remains **NO-GO**.
