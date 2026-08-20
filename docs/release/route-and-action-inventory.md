# Route and action inventory

Checked on 2026-08-20 against the server build. “Authoritative source” identifies the record that decides success; the browser never grants credits, access, approval, completion, or delivery by itself.

## Public and account routes

| Route                     | Visible actions                                                                                           | Authoritative source and failure state                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                       | Open tutor search, courses, help, account, messages, referrals, wallet, tutor application, school contact | Approved tutor API; explicit tutor loading, empty, and unavailable states; every button navigates or opens the working search form                                                                      |
| `/how-it-works`           | Tutor filters, wallet, learning, admin explanation                                                        | Links to real routes; illustrations use generic labels and make no account-data claim                                                                                                                   |
| `/tutors`                 | Search/filter/sort, clear filters, open profile                                                           | Approved marketplace view; loading, empty, and provider-error states                                                                                                                                    |
| `/tutor`                  | Favourite, share, report, message, choose format/slot, book                                               | Approved profile, availability RPC, persistent messages/favourites, support case, atomic booking/ledger; distinct loading, not-found, unavailable, validation, insufficient-credit, and provider states |
| `/favourites`             | Open/remove favourite                                                                                     | Persistent favourite records plus approved tutor API; loading, empty, signed-out, and retry states                                                                                                      |
| `/become-a-tutor`         | Continue to application, policy link                                                                      | Auth check then secure application; static preview and connection failures are explicit                                                                                                                 |
| `/become-a-tutor/profile` | Save draft, upload, submit, withdraw, propose update                                                      | Persistent application/storage/review workflow; validation, permission, scanner, upload, and review states                                                                                              |
| `/login`                  | Accept policies and request secure email link                                                             | Authentication provider; neutral success response, validation, rate-limit, provider, and static-preview states                                                                                          |
| `/account`                | Update profile, export data                                                                               | Authenticated account API; loading, validation, permission, and retry states                                                                                                                            |
| `/bookings`               | Refresh, cancel before start, open released Meet link                                                     | Booking/refund/Meet services; empty, pending, provider-support, revoked, and retry states                                                                                                               |
| `/messages`               | Refresh, report, block, continue conversation                                                             | Persistent conversation/message/moderation records; loading, empty, permission, offline/retry, and provider-copy states                                                                                 |
| `/notifications`          | Refresh, mark read, update preferences                                                                    | Transactional outbox records; loading, empty, retry, preference, suppression, and dead-letter operations                                                                                                |
| `/wallet`                 | Refresh and review activity                                                                               | Immutable ledger; empty and retry states; online deposits accurately unavailable                                                                                                                        |
| `/referral`               | Copy/share link, refresh rewards                                                                          | Persistent referral attribution/reward plus ledger; empty and retry states                                                                                                                              |
| `/learn`                  | Browse/purchase/open purchased course                                                                     | Published LMS records, purchase ledger, and entitlement; loading, empty, validation, insufficient-credit, and retry states                                                                              |
| `/lesson`                 | Watch, download authorised resource, answer and submit quiz                                               | Purchase entitlement, signed resource access, and server scoring; loading, permission, validation, and retry states                                                                                     |

## Support and policy routes

| Route                   | Visible actions                                           | Authoritative source and failure state                                                           |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/help`                 | Navigate to support, safety, refund, and account guidance | Published operational content with real destinations                                             |
| `/contact`              | Create case, add information                              | Private support records and durable case number; validation, permission, empty, and retry states |
| `/privacy`              | Read current Privacy Notice                               | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/terms`                | Read current Terms                                        | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/tutor-agreement`      | Read Tutor Agreement                                      | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/community-guidelines` | Read Community Guidelines                                 | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/safety`               | Read safety and escalation guidance                       | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/cancellation-refunds` | Read cancellation/refund rules                            | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/cookies`              | Read current storage behavior                             | Version `2026-08-20`, fingerprinted in the policy register                                       |
| `/accessibility`        | Read accessibility statement and contact route            | Version `2026-08-20`, fingerprinted in the policy register                                       |

## Tutor and administrator routes

| Route                       | Visible actions                                                            | Authoritative source and failure state                                                  |
| --------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `/tutor/availability`       | Replace rules, exceptions, formats, prices                                 | Tutor-owned availability RPC; validation, conflict, permission, empty, and retry states |
| `/tutor/earnings`           | Review pending/available/paid/refunded credits and request payout          | Earnings/payout ledgers; minimum, destination, hold, retry, and reconciliation states   |
| `/admin`                    | Create and publish course/lesson/quiz content; navigate operations         | Admin-authorised LMS records; validation, permission, empty, and retry states           |
| `/admin/tutor-applications` | Review evidence, request changes, approve/reject/suspend                   | Admin-only application state machine and audit events                                   |
| `/admin/wallet`             | Record verified offline deposit                                            | Admin-only balanced ledger transaction with reconciliation reference                    |
| `/admin/message-reports`    | Review moderation reports                                                  | Admin-only report/block/audit records                                                   |
| `/admin/payouts`            | Verify destination, release/refund, request/retry/settle payout, reconcile | Admin-only immutable earnings/payout records; idempotency and failure states            |
| `/admin/notifications`      | Inspect/retry/dead-letter deliveries and suppressions                      | Notification outbox and provider receipt records                                        |
| `/admin/support`            | Assign, prioritize, reply, resolve, and escalate                           | Private support case/message/audit records with response deadlines                      |
| `/admin/policy-review`      | Record completed owner/professional review                                 | Append-only truthful policy attestations; no review is pre-filled or implied            |

## Preview and fixture boundary

- GitHub Pages is a static, non-authoritative preview. Secure account pages render an unavailable notice; sign-in and tutor application controls are disabled. It never loads bundled users, tutors, funds, bookings, reviews, messages, referrals, courses, or provider success.
- The reviewed development course and administrator fixture can run only through `pnpm db:seed:development` when `STUDACAD_ENV` is exactly `development` or `test`. Production execution fails before opening a database connection.
- Social buttons were removed until verified official accounts exist. School enquiries use the private support workflow. Testimonials and aggregate platform ratings are omitted until reviewed real records exist.

## Verification evidence

- Unit/integration checks scan application source for browser-authoritative storage, tutor fixtures, generated client message success, and preview bypasses.
- Database integration tests exercise empty state plus representative learner, tutor, and admin ownership, permission, ledger, booking, messaging, payout, notification, support, and policy flows.
- Browser checks exercise public security headers, neutral sign-in with required policy acceptance, request-size limits, rate limits, and the fresh signed-out route boundary.
- Production-like staging must repeat the smoke checklist in `docs/release/staging-smoke-checklist.md` after external provider credentials and the release domain are provisioned.
