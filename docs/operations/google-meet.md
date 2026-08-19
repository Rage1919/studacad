# Google Meet operations

## Credential model

Studacad uses OAuth user authorization for one dedicated Google Workspace organizer and requests only `https://www.googleapis.com/auth/meetings.space.created`. Google documents that the Meet REST API requires user authentication and that `spaces.create` accepts this narrow scope. Do not paste access tokens into deployment variables: store the OAuth client secret and refresh token in the server secret store so the application can refresh short-lived tokens automatically.

Provider setup is intentionally external and remains disabled until the Google account exists:

1. Enable the Google Meet REST API in the production Google Cloud project.
2. Configure the OAuth consent screen and create a server OAuth client.
3. Authorize a dedicated organizer account for the single Meet scope and store the resulting refresh token, client ID/secret, and organizer email as the documented deployment variables.
4. Rotate or revoke the refresh token immediately after suspected exposure or organizer-access changes.
5. Configure the platform scheduler to call `POST /api/internal/meet/provision` every minute with `Authorization: Bearer <MEET_PROVISIONER_SECRET>`.

Official references: [Meet authentication and scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize) and [`spaces.create`](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create).

## Lifecycle and access

An online booking atomically creates one `booking_meetings` row. The worker conditionally claims that row before calling Google, so concurrent workers cannot intentionally create two spaces. Successful provider identifiers and the organizer are stored server-side. Learners and tutors see the same timezone-aware booking record; the join link appears 24 hours before start by default. Admins may inspect it earlier for support.

Rescheduling keeps the existing space and recalculates the release time from the current booking. Cancelling revokes link retrieval in Studacad immediately. Group learners who cancel lose access individually while the remaining active participants retain the group meeting.

## Failure and recovery

- Missing configuration returns `503`; the booking remains confirmed and is never labelled ready.
- Token errors, rate limits, and explicit provider `5xx` responses retry with capped exponential backoff.
- A network break after the create request, an invalid success response, or a persistence failure enters `support_required`. Do not retry automatically because Google may already have created a space.
- Search audit events `meeting.provisioned` and `meeting.provisioning_failed` by booking ID. Resolve unknown outcomes against the dedicated organizer account before resetting a row to `pending`.
- Never put refresh tokens, access tokens, Meet URLs, or provider response bodies in logs or tickets.

During an outage, bookings and credits remain authoritative. Communicate the meeting delay through the support flow; do not recreate or recharge the booking.
