# Learning, favourites, and referral operations

## Source of truth

Courses, lessons, quiz questions/options, purchases, attempts, progress, tutor favourites, referral attribution, and referral rewards are stored in PostgreSQL per authenticated account. Browser storage is not authoritative. Quiz correct-answer flags and private lesson fields are returned only to an authorized learner who owns the course or to an administrator.

Course purchases and referral rewards post balanced, idempotent entries to the shared wallet ledger. Quiz attempts never mint credits. A referral reward is 50 credits, once per referred account, after that learner's first paid booking is marked completed.

## Content workflow

1. An administrator creates a course draft in `/admin`.
2. The administrator creates at least one lesson draft with complete quiz options.
3. The lesson is reviewed and published.
4. The course can then be published. Archiving a course or lesson removes it from learner catalogue responses without deleting history.
5. Every mutation writes an audit event. Correct quiz options never appear in learner responses.

Private files must be stored in the existing private bucket, marked `clean`, and linked through `course_resources`. `/api/lms/resources/:resourceId` issues a short-lived download only after server-side purchase authorization.

## Development seed

`pnpm db:seed:development` imports one reviewed sample course and an administrator only when `STUDACAD_ENV` is `development` or `test`. It creates no wallet funding, purchases, progress, attempts, attribution, or referral rewards.

## Rollback and incident handling

- Disable or archive affected content instead of deleting records.
- If a content mutation was incorrect, use its audit event to reconstruct the prior state and issue a reviewed forward correction.
- Ledger entries and audit events are append-only. Never edit or delete them during rollback.
- A mistakenly earned referral reward must be reversed through a compensating ledger transaction and a `reversed` reward state; do not mutate the original ledger transaction.
- If quiz answers may have leaked, archive the lesson, replace the questions/options in a reviewed migration, and invalidate any related cached responses.

