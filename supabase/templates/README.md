# Studacad authentication email branding

These production templates keep the authentication provider private while preserving Studacad's passwordless, one-time-link flow.

## Hosted project settings

Configure a custom SMTP provider before applying the templates. New Free-plan projects cannot customize authentication templates while using the built-in mail service, and the built-in service is restricted to project-team addresses.

Use these sender values:

- sender name: `Studacad Administrator`
- sender email: `admin@studacad.com`
- reply-to/support destination: the monitored Studacad support mailbox selected for launch

The SMTP provider supplies the host, port, username, and password. Verify `studacad.com` with that provider and publish its SPF and DKIM records. Add a DMARC record after SPF and DKIM pass. Disable provider link tracking because authentication links are single-use.

In the hosted project dashboard:

1. Open **Authentication > Emails > SMTP Settings**, enable custom SMTP, and save the provider credentials and sender values.
2. Open **Authentication > Email Templates > Confirm sign up**. Copy `confirm-signup.subject.txt` into the subject field and `confirm-signup.html` into the body field.
3. Open **Authentication > Email Templates > Magic link**. Copy `magic-link.subject.txt` into the subject field and `magic-link.html` into the body field.
4. Keep the application Site URL as `https://studacad.com` and allow `https://studacad.com/auth/callback` as a redirect URL.
5. Send one registration email and one sign-in email to a non-team address. Confirm that the sender, subject, body, link domain, session cookie, and post-sign-in redirect are correct.

The templates deliberately use `{{ .RedirectTo }}` plus `{{ .TokenHash }}`. The application supplies a Studacad callback URL and verifies the token hash server-side, so recipients do not see a provider domain in the message or link.
