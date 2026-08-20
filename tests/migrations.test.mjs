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

test("tutor onboarding enforces reviewer authority and publishes only approved active profiles", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000011', 'applicant@example.test', 'Masego Tutor', 'active', now()),
        ('10000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000012', 'admin@example.test', 'Admin', 'active', now());
      insert into public.user_roles (user_id, role)
      values ('10000000-0000-4000-8000-000000000011', 'learner'), ('10000000-0000-4000-8000-000000000012', 'admin');
    `);
    const saved = await db.query(`
      select public.save_tutor_application(
        '10000000-0000-4000-8000-000000000011', null::uuid,
        '{
          "legalName":"Masego Tutor","phoneE164":"+26771234567","district":"South-East","town":"Gaborone",
          "headline":"Patient mathematics tutor for Botswana learners",
          "biography":"I use careful explanations, worked examples, and exam-style practice to help every learner build confidence and answer questions independently.",
          "teachingExperience":"3–5 years","qualification":"Bachelor of Education","institution":"University of Botswana",
          "languages":["English","Setswana"],"basePriceCredits":80,"sessionDurationMinutes":60,
          "days":["Mon","Wed"],"startTime":"16:00","endTime":"19:00","consent":true,
          "subjectEntries":[{"examination":"PSLE","subject":"Mathematics"}],"formats":["online_1to1"]
        }'::jsonb
      ) as id
    `);
    const applicationId = saved.rows[0].id;
    const documents = [
      ["identity", "tutor_identity", "identity.pdf", "application/pdf"],
      ["qualification", "tutor_qualification", "qualification.pdf", "application/pdf"],
      ["profile_image", "profile_image", "profile.jpg", "image/jpeg"]
    ];
    for (const [documentType, kind, filename, contentType] of documents) {
      await db.query(`
        select public.register_tutor_application_document(
          $1, $2, $3, $4::public.object_kind, $5, $6, $7, 1024, repeat('a', 64), 'test-clean'
        )
      `, ["10000000-0000-4000-8000-000000000011", applicationId, documentType, kind, `applicant/${filename}`, filename, contentType]);
    }

    await db.query("select public.transition_tutor_application($1, $2, 'submitted', null, null)", ["10000000-0000-4000-8000-000000000011", applicationId]);
    await assert.rejects(
      db.query("select public.transition_tutor_application($1, $2, 'submitted', null, null)", ["10000000-0000-4000-8000-000000000011", applicationId]),
      /Invalid or unauthorized/
    );
    await assert.rejects(
      db.query("select public.transition_tutor_application($1, $2, 'under_review', null, null)", ["10000000-0000-4000-8000-000000000011", applicationId]),
      /Invalid or unauthorized/
    );
    assert.equal((await db.query("select count(*)::integer as count from public.public_tutor_marketplace_profiles")).rows[0].count, 0);

    await db.query("select public.transition_tutor_application($1, $2, 'under_review', 'Evidence opened', null)", ["10000000-0000-4000-8000-000000000012", applicationId]);
    await db.query("select public.transition_tutor_application($1, $2, 'approved', 'Evidence verified', 'Your application is approved.')", ["10000000-0000-4000-8000-000000000012", applicationId]);
    assert.equal((await db.query("select count(*)::integer as count from public.public_tutor_marketplace_profiles")).rows[0].count, 1);

    await db.query("select public.transition_tutor_application($1, $2, 'suspended', 'Policy investigation', 'Your profile is temporarily suspended.')", ["10000000-0000-4000-8000-000000000012", applicationId]);
    assert.equal((await db.query("select count(*)::integer as count from public.public_tutor_marketplace_profiles")).rows[0].count, 0);
    await db.exec("update public.object_files set retention_until = now() - interval '1 day' where kind = 'tutor_identity'");
    const expiredFile = (await db.query("select id from public.object_files where kind = 'tutor_identity'")).rows[0];
    assert.equal((await db.query("select public.finalize_expired_object_deletion($1) as deleted", [expiredFile.id])).rows[0].deleted, true);
    assert.equal((await db.query("select count(*)::integer as count from public.audit_events where action = 'storage.retention_deleted'")).rows[0].count, 1);
  } finally {
    await db.close();
  }
});
