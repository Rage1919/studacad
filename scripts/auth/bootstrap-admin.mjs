import nextEnvironment from "@next/env";
import postgres from "postgres";
import { normalizeEmail } from "../../server/auth/auth-policy.mjs";

const { loadEnvConfig } = nextEnvironment;
loadEnvConfig(process.cwd());

const email = normalizeEmail(process.env.STUDACAD_BOOTSTRAP_ADMIN_EMAIL);
const confirmation = process.env.STUDACAD_BOOTSTRAP_CONFIRM;
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!email) throw new Error("STUDACAD_BOOTSTRAP_ADMIN_EMAIL must be a valid, verified account email.");
if (confirmation !== "grant-first-admin") throw new Error("Set STUDACAD_BOOTSTRAP_CONFIRM=grant-first-admin to confirm this audited operation.");
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const sql = postgres(databaseUrl, { max: 1, application_name: "studacad-admin-bootstrap" });
try {
  await sql.begin(async transaction => {
    await transaction`select pg_advisory_xact_lock(hashtext('studacad-first-admin'))`;
    const existingAdmins = await transaction`
      select count(*)::integer as count
      from public.user_roles
      where role = 'admin' and revoked_at is null
    `;
    if (existingAdmins[0].count > 0) throw new Error("An active admin already exists; use an authenticated admin role-management workflow.");

    const accounts = await transaction`
      select id, status, email_verified_at
      from public.user_accounts
      where email = ${email} and deleted_at is null
      for update
    `;
    const account = accounts[0];
    if (!account || account.status !== "active" || !account.email_verified_at) {
      throw new Error("The bootstrap account must already exist, be active, and have a verified email.");
    }

    await transaction`
      insert into public.user_roles (user_id, role, granted_by)
      values (${account.id}, 'admin', ${account.id})
      on conflict (user_id, role) do update set revoked_at = null, granted_by = excluded.granted_by, granted_at = now()
    `;
    await transaction`
      insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
      values (${account.id}, 'role.admin_bootstrapped', 'user_account', ${account.id}, ${transaction.json({ source: "bootstrap-script" })})
    `;
  });
  process.stdout.write(`First admin role granted to ${email}.\n`);
} finally {
  await sql.end();
}
