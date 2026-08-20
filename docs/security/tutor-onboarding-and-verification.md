# Tutor onboarding and verification

## Workflow and authorization

An active authenticated learner may have one open tutor application at a time. Drafts and change-requested applications are editable. A rejected or withdrawn application is closed and a new application may be created. An approved tutor may propose a new version; the existing public profile remains active until the new version is separately approved.

The database enforces the state machine inside a locked transaction:

- applicant: `draft → submitted`, `changes_requested → submitted`, and open states → `withdrawn`;
- administrator: `submitted → under_review → changes_requested | approved | rejected`;
- administrator: `approved → suspended` and `suspended → approved`.

Browser input cannot set application state, grant the tutor role, or publish a profile. The review endpoint requires the server-derived admin role, and the database function repeats the role and active-account check. Every save, document upload, state transition, approval, rejection, and suspension writes an immutable audit event. Reviewer notes are separate from messages shown to applicants.

Approval atomically creates or updates the public profile, copies approved subjects and formats, activates the tutor role, and publishes the profile. Suspension atomically removes the profile from marketplace queries and revokes the active tutor role. The public marketplace view also requires an active account, an approved application, an active profile, and a clean profile image.

## Server validation

Submission validates legal/contact details, public headline and biography length, district/location, teaching experience, qualification and institution, lesson languages, subjects and examination levels, lesson formats, price, session duration, availability days/times, consent, and all three required clean uploads. Duplicate submission and invalid transition attempts fail at the database boundary.

## Private file handling

Identity, qualification, and pre-publication profile images use the private `studacad-private` bucket. The upload route:

1. requires an authenticated owner and exact same-origin request;
2. enforces the per-document MIME allowlist and 5 MB/10 MB limits;
3. checks PDF, PNG, and JPEG magic bytes instead of trusting the filename;
4. sends the bytes to the configured malware-scanning gateway;
5. uploads only a clean result under an account/application-scoped random object key;
6. records SHA-256, provider reference, retention date, ownership, and clean status;
7. removes the object if database registration fails.

The scanning gateway receives a multipart `file` field with `Authorization: Bearer <STUDACAD_MALWARE_SCAN_TOKEN>` and must respond with `{ "status": "clean" | "infected", "reference": "..." }`. Preview, staging, and production uploads fail closed when the gateway or token is absent, times out, or returns an invalid result. Development/test performs only an EICAR signature guard and must never be exposed as a production fallback.

Private downloads use one-minute signed URLs and require either the file owner or an active administrator. No publishable-client storage policy exists.

## Retention and privacy operations

- draft uploads receive a 90-day retention date;
- rejected and withdrawn evidence is scheduled for deletion after 30 days;
- approved identity and qualification evidence is retained for up to two years for re-verification;
- an approved public profile image is retained while the profile remains active;
- replaced evidence is soft-deleted and scheduled within 30 days;
- account deletion remains governed by the account-deletion workflow and any legal hold.

Schedule `pnpm storage:delete-expired` with the production secret key. It rechecks each retention date, removes the private object, marks its metadata deleted, and appends an immutable audit event. The two-year approval period and legal-hold rules require confirmation by Botswana privacy/legal counsel before accepting real applicants.

## Operator checklist

1. Configure `STUDACAD_MALWARE_SCAN_URL` and its secret token in staging.
2. Upload clean PDF/JPEG/PNG fixtures and the EICAR test fixture; confirm only clean files persist.
3. Submit a complete application and confirm a non-admin cannot access the review queue or private files.
4. Request changes, edit the same application, resubmit, approve, and confirm the profile appears in `/api/tutors`.
5. Start a profile revision and confirm the old approved profile remains visible until approval.
6. Suspend the tutor and confirm marketplace visibility and tutor authorization disappear immediately.
7. Review immutable application reviews and audit events for every decision.
8. Schedule and test `pnpm storage:delete-expired` before collecting real identity data.

## Rollback and incident response

- Scanner outage: uploads already fail closed; do not bypass scanning. Keep applications editable and restore the scanner.
- Accidental approval: suspend the profile immediately, preserve audit/review records, and notify the applicant.
- Evidence disclosure: revoke signed links by waiting at most one minute, rotate storage credentials if needed, suspend public access, and audit file access/provider logs.
- Faulty application release: roll back application code without reverting approved/rejected decisions or immutable audit data. Database changes are additive.
