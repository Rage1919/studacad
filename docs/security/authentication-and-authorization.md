# Authentication and authorization

## Chosen flow

Studacad uses Supabase Auth with passwordless email magic links and PKCE. Google and Apple buttons were removed because those providers are not configured. The email flow serves registration, sign-in, verification, and account recovery without revealing whether an address already exists.

Configure these allowed redirect URLs in each Supabase project:

- local: `http://localhost:3000/auth/callback`
- staging: the private Sites origin plus `/auth/callback`
- production: `https://studacad.com/auth/callback`

Only the server calls the Auth SDK. Session access and refresh tokens are stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies outside local/test. Auth responses are `private, no-store`. `proxy.ts` refreshes/rotates tokens, while every protected data-access method and mutation repeats the authoritative user/role check.

Set the Supabase project session policy to:

- access-token lifetime: 60 minutes;
- refresh-token rotation and reuse detection: enabled;
- inactivity timeout: 7 days;
- absolute session lifetime: 30 days;
- single-session enforcement: optional for learners, required for admin accounts if supported by the selected plan.

The provider remains the source of truth for session expiry and revocation. The server uses `auth.getUser()` rather than trusting unverified cookie claims. Sign-out revokes the current session; account deletion requests revoke all of the user's sessions.

## Roles and protected surfaces

Roles live only in `user_roles`. Browser input, URL parameters, and auth metadata never grant a role. All verified accounts start as learners. Tutor status is added by the approval workflow; admin status is granted only by the audited bootstrap or a future admin-only role-management action.

Protected pages include account, admin, wallet, learning, lessons, messages, favourites, referrals, and tutor-profile editing. The admin page requires the `admin` role. Message, referral, Meet, account, and future wallet/booking/content/payout mutations must call `requireViewer` and apply exact same-origin CSRF validation. Provider webhooks use signature verification instead of a user session.

Page/layout checks provide navigation behavior only. They do not replace checks at the data-access or mutation boundary.

## Threat model and controls

| Threat | Control |
| --- | --- |
| Account enumeration | Valid email submissions receive the same accepted response regardless of account/provider result |
| Stolen or fixed session | One-time PKCE exchange, rotated refresh tokens, provider reuse detection, `HttpOnly`/`Secure` cookies, server validation |
| CSRF | Exact `Origin` match and `Sec-Fetch-Site` validation on unsafe authenticated requests; `SameSite=Lax` cookies |
| Role escalation | Roles read from the database; no client role mutation policy; audited admin bootstrap |
| Cross-account updates | Account mutations derive `user_id` from the verified session and never accept a target user ID |
| Cached session leakage | Authenticated responses and proxy refreshes use private no-store headers |
| Open redirect | Callback destinations accept only origin-relative paths |
| Duplicate identities | Only email auth is exposed; Supabase's verified-email identity rules are authoritative and manual email-based linking is prohibited |
| Suspended/deleting account reactivation | Auth synchronization preserves suspended, deletion-requested, and deleted states |

## First-admin bootstrap

1. Sign in normally with the intended admin email so an active, verified account exists.
2. Back up the database and set the target `DATABASE_URL`.
3. Set `STUDACAD_BOOTSTRAP_ADMIN_EMAIL` to the exact verified address.
4. Set `STUDACAD_BOOTSTRAP_CONFIRM=grant-first-admin`.
5. Run `pnpm auth:bootstrap-admin` once.
6. Verify the `role.admin_bootstrapped` audit event and `/admin` access.

The script takes a database advisory lock and refuses to run when any active admin already exists. Subsequent role changes require an authenticated, audited admin workflow.

## Incident response and rollback

- Suspected session theft: revoke the affected user's sessions in Supabase and review `auth.session_started` audit events.
- Leaked publishable key: rotate it and redeploy; review rate-limit and auth logs.
- Leaked secret key: revoke immediately, rotate every environment, redeploy, and review all service-role activity.
- Faulty auth release: roll back application code, but do not remove account or audit records. Existing sessions must still be revalidated server-side.
- Disable public access if authorization cannot be guaranteed.
