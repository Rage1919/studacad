# Registration and demo tutor release decisions

Date: 2026-08-22

- Registration uses the existing passwordless Supabase email-link flow. Registration creates an account; login is restricted to existing accounts.
- Registration collects a display name and requires the current Terms and Privacy Notice. The existing auth-to-account trigger records the versioned acceptance after email confirmation.
- Login and Register are shown only after the session check confirms the visitor is logged out. Account is shown instead after login.
- Messages, Refer, Wallet, and the homepage Help shortcut are shown only after the session check confirms the visitor is logged in.
- Ten Botswana-focused tutor profiles are fictional demonstration data. Every public tutor surface labels them as demo profiles instead of presenting them as verified people.
- Demo portraits are deterministic illustrated assets generated through the DiceBear Lorelei API, whose artwork is published under CC0. The files are stored locally so the marketplace has no runtime avatar dependency.
- Demo records use stable IDs and idempotent inserts so the migration can be reproduced safely. They include ten portraits and thirty recurring availability rules.
- Supabase's post-migration advisor found pre-existing direct browser execution privileges on server-only `SECURITY DEFINER` functions. A follow-up migration revoked those grants from anonymous and authenticated roles, retained service-role execution, and fixed three mutable function search paths.
- Remaining advisor notices are informational: RLS-enabled server-only tables intentionally have no browser policies, unused indexes are expected before real traffic, and broader foreign-key index tuning is deferred until workload evidence exists.
