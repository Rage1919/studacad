import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

const expectedTables = [
  "audit_events",
  "availability_exceptions",
  "availability_rules",
  "booking_participants",
  "booking_status_events",
  "bookings",
  "conversation_participants",
  "conversations",
  "course_purchases",
  "course_resources",
  "courses",
  "ledger_entries",
  "ledger_transactions",
  "lesson_progress",
  "lessons",
  "messages",
  "notifications",
  "object_files",
  "payment_refunds",
  "payments",
  "provider_webhook_events",
  "quiz_attempt_answers",
  "quiz_attempts",
  "quiz_options",
  "quiz_questions",
  "referral_attributions",
  "referral_codes",
  "referral_rewards",
  "tutor_applications",
  "tutor_earnings",
  "tutor_payouts",
  "tutor_profiles",
  "user_accounts",
  "user_roles",
  "wallet_accounts"
];

async function apply(db, migrations) {
  for (const migration of migrations) await db.exec(migration.sql);
}

async function tableNames(db) {
  const result = await db.query(`
    select tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  `);
  return result.rows.map(row => row.tablename);
}

test("migrations build the complete schema from an empty database", async () => {
  const db = new PGlite();
  try {
    const migrations = await readMigrationFiles();
    await apply(db, migrations);
    const actual = await tableNames(db);
    for (const table of expectedTables) assert.ok(actual.includes(table), `missing table ${table}`);

    const rowSecurity = await db.query(`
      select count(*)::integer as count
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relkind = 'r'
        and pg_class.relrowsecurity = false
    `);
    assert.equal(rowSecurity.rows[0].count, 0);
  } finally {
    await db.close();
  }
});

test("the next migration applies to the representative previous schema", async () => {
  const db = new PGlite();
  try {
    const migrations = await readMigrationFiles();
    await apply(db, migrations.slice(0, 1));
    assert.ok((await tableNames(db)).includes("bookings"));
    assert.ok(!(await tableNames(db)).includes("ledger_entries"));

    await apply(db, migrations.slice(1));
    assert.ok((await tableNames(db)).includes("ledger_entries"));
    assert.ok((await tableNames(db)).includes("audit_events"));
  } finally {
    await db.close();
  }
});

test("critical idempotency and tutor-overlap constraints fail closed", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status)
      values
        ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'tutor@example.test', 'Tutor', 'active'),
        ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'learner@example.test', 'Learner', 'active');
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'approved');
      insert into public.tutor_profiles (
        id, tutor_user_id, approved_application_id, status, slug, headline, about, location, base_price_credits
      ) values (
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        'active', 'test-tutor', 'Test tutor', 'Test tutor biography', 'Gaborone', 80
      );
      insert into public.bookings (
        tutor_profile_id, created_by_user_id, format, examination, subject, starts_at, ends_at,
        timezone, price_per_learner_credits, status, idempotency_key
      ) values (
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        'online_1to1', 'PSLE', 'Mathematics', '2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z',
        'Africa/Gaborone', 80, 'confirmed', 'booking-one'
      );
      insert into public.provider_webhook_events (provider, provider_event_id, event_type, payload_sha256, status)
      values ('test', 'event-one', 'payment.completed', repeat('a', 64), 'processed');
    `);

    await assert.rejects(db.exec(`
      insert into public.bookings (
        tutor_profile_id, created_by_user_id, format, examination, subject, starts_at, ends_at,
        timezone, price_per_learner_credits, status, idempotency_key
      ) values (
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        'online_1to1', 'PSLE', 'Mathematics', '2026-09-01T10:30:00Z', '2026-09-01T11:30:00Z',
        'Africa/Gaborone', 80, 'confirmed', 'booking-two'
      )
    `), /overlapping active booking/);

    await assert.rejects(db.exec(`
      insert into public.provider_webhook_events (provider, provider_event_id, event_type, payload_sha256, status)
      values ('test', 'event-one', 'payment.completed', repeat('b', 64), 'processed')
    `), /unique|duplicate/i);
  } finally {
    await db.close();
  }
});

test("financial and audit records are append-only", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.wallet_accounts (system_code) values ('issuance');
      insert into public.ledger_transactions (kind, idempotency_key, description)
      values ('adjustment', 'migration-test', 'Migration test');
      insert into public.ledger_entries (transaction_id, wallet_account_id, amount_credits)
      select transaction.id, wallet.id, 1
      from public.ledger_transactions transaction
      cross join public.wallet_accounts wallet
      where transaction.idempotency_key = 'migration-test' and wallet.system_code = 'issuance';
    `);
    await assert.rejects(
      db.exec("update public.ledger_entries set amount_credits = 2"),
      /append-only/
    );
  } finally {
    await db.close();
  }
});
