import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

const expectedTables = [
  "audit_events",
  "availability_exceptions",
  "availability_rules",
  "booking_participants",
  "booking_refunds",
  "booking_location_details",
  "booking_meetings",
  "booking_status_events",
  "bookings",
  "conversation_participants",
  "conversations",
  "course_purchases",
  "course_resources",
  "contact_blocks",
  "courses",
  "ledger_entries",
  "ledger_transactions",
  "lesson_progress",
  "lessons",
  "messages",
  "message_deliveries",
  "message_reports",
  "notifications",
  "notification_preferences",
  "notification_suppressions",
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
  "tutor_favourites",
  "tutor_messaging_channels",
  "tutor_payouts",
  "tutor_payout_destinations",
  "tutor_payout_events",
  "tutor_profiles",
  "user_accounts",
  "user_roles",
  "wallet_accounts",
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
  return result.rows.map((row) => row.tablename);
}

test("migrations build the complete schema from an empty database", async () => {
  const db = new PGlite();
  try {
    const migrations = await readMigrationFiles();
    await apply(db, migrations);
    const actual = await tableNames(db);
    for (const table of expectedTables)
      assert.ok(actual.includes(table), `missing table ${table}`);

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

    await assert.rejects(
      db.exec(`
      insert into public.bookings (
        tutor_profile_id, created_by_user_id, format, examination, subject, starts_at, ends_at,
        timezone, price_per_learner_credits, status, idempotency_key
      ) values (
        '40000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000002',
        'online_1to1', 'PSLE', 'Mathematics', '2026-09-01T10:30:00Z', '2026-09-01T11:30:00Z',
        'Africa/Gaborone', 80, 'confirmed', 'booking-two'
      )
    `),
      /overlapping active booking/,
    );

    await assert.rejects(
      db.exec(`
      insert into public.provider_webhook_events (provider, provider_event_id, event_type, payload_sha256, status)
      values ('test', 'event-one', 'payment.completed', repeat('b', 64), 'processed')
    `),
      /unique|duplicate/i,
    );
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
      /append-only/,
    );
  } finally {
    await db.close();
  }
});

test("verified deposits are authorized, idempotent, balanced, and priced one-to-one", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000021', 'admin-wallet@example.test', 'Wallet Admin', 'active', now()),
        ('10000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000022', 'learner-wallet@example.test', 'Wallet Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000023', 'other-wallet@example.test', 'Other Learner', 'active', now());
      insert into public.user_roles (user_id, role)
      values
        ('10000000-0000-4000-8000-000000000021', 'admin'),
        ('10000000-0000-4000-8000-000000000022', 'learner'),
        ('10000000-0000-4000-8000-000000000023', 'learner');
    `);

    const args = [
      "10000000-0000-4000-8000-000000000021",
      "10000000-0000-4000-8000-000000000022",
      250,
      "BANK-2026-001",
      "verified-deposit-001",
    ];
    const first = await db.query(
      "select public.record_verified_deposit($1, $2, $3, $4, $5) as id",
      args,
    );
    const replay = await db.query(
      "select public.record_verified_deposit($1, $2, $3, $4, $5) as id",
      args,
    );
    assert.equal(replay.rows[0].id, first.rows[0].id);

    const learnerBalance = await db.query(`
      select balance_credits::integer as balance
      from public.wallet_balances balance
      join public.wallet_accounts wallet on wallet.id = balance.wallet_account_id
      where wallet.owner_user_id = '10000000-0000-4000-8000-000000000022'
    `);
    assert.equal(learnerBalance.rows[0].balance, 250);
    const transaction = await db.query(
      `
      select sum(entry.amount_credits)::integer as net, count(*)::integer as entry_count
      from public.ledger_entries entry
      where entry.transaction_id = $1
    `,
      [first.rows[0].id],
    );
    assert.deepEqual(transaction.rows[0], { net: 0, entry_count: 2 });
    const payment = await db.query(
      "select amount_minor::integer, credits from public.payments",
    );
    assert.deepEqual(payment.rows[0], { amount_minor: 25000, credits: 250 });
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.audit_events where action = 'wallet.verified_deposit_recorded'",
        )
      ).rows[0].count,
      1,
    );

    await assert.rejects(
      db.query("select public.record_verified_deposit($1, $2, $3, $4, $5)", [
        args[0],
        args[1],
        251,
        args[3],
        args[4],
      ]),
      /different deposit details/,
    );
    await assert.rejects(
      db.query("select public.record_verified_deposit($1, $2, $3, $4, $5)", [
        "10000000-0000-4000-8000-000000000023",
        ...args.slice(1, 4),
        "verified-deposit-002",
      ]),
      /Only an active administrator/,
    );
    await assert.rejects(
      db.exec(`
      insert into public.payments (user_id, provider, status, amount_minor, currency, credits, checkout_reference)
      values ('10000000-0000-4000-8000-000000000022', 'test', 'paid', 25000, 'BWP', 300, 'invalid-parity')
    `),
      /payments_bwp_credit_parity/,
    );
  } finally {
    await db.close();
  }
});

test("availability produces bookable slots and booking holds/refunds credits atomically", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000031', 'booking-admin@example.test', 'Booking Admin', 'active', now()),
        ('10000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000032', 'booking-tutor@example.test', 'Booking Tutor', 'active', now()),
        ('10000000-0000-4000-8000-000000000033', '20000000-0000-4000-8000-000000000033', 'booking-learner@example.test', 'Booking Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000034', '20000000-0000-4000-8000-000000000034', 'second-learner@example.test', 'Second Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000035', '20000000-0000-4000-8000-000000000035', 'third-learner@example.test', 'Third Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000036', '20000000-0000-4000-8000-000000000036', 'empty-wallet@example.test', 'Empty Wallet', 'active', now());
      insert into public.user_roles (user_id, role)
      values
        ('10000000-0000-4000-8000-000000000031', 'admin'),
        ('10000000-0000-4000-8000-000000000032', 'tutor'),
        ('10000000-0000-4000-8000-000000000033', 'learner'),
        ('10000000-0000-4000-8000-000000000034', 'learner'),
        ('10000000-0000-4000-8000-000000000035', 'learner'),
        ('10000000-0000-4000-8000-000000000036', 'learner');
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000032', 'approved');
      insert into public.tutor_profiles (
        id, tutor_user_id, approved_application_id, status, slug, headline, about, location, timezone, base_price_credits, published_at
      ) values (
        '40000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000032',
        '30000000-0000-4000-8000-000000000031', 'active', 'booking-tutor', 'Booking tutor',
        'A sufficiently complete biography for booking tests.', 'Gaborone', 'Africa/Gaborone', 80, now()
      );
      insert into public.tutor_profile_subjects (tutor_profile_id, examination, subject, price_credits)
      values ('40000000-0000-4000-8000-000000000031', 'PSLE', 'Mathematics', 80);
      insert into public.tutor_profile_formats (tutor_profile_id, format, group_capacity)
      values
        ('40000000-0000-4000-8000-000000000031', 'online_1to1', 1),
        ('40000000-0000-4000-8000-000000000031', 'online_group', 2);
    `);
    await db.query(`
      select public.replace_tutor_availability(
        '10000000-0000-4000-8000-000000000032',
        jsonb_build_array(
          jsonb_build_object(
            'weekday', extract(dow from current_date + 7)::smallint, 'local_start_time', '10:00', 'local_end_time', '12:00',
            'timezone', 'Africa/Gaborone', 'format', 'online_1to1', 'slot_duration_minutes', 60,
            'lead_time_minutes', 0, 'buffer_before_minutes', 0, 'buffer_after_minutes', 10,
            'effective_from', current_date, 'effective_until', null
          ),
          jsonb_build_object(
            'weekday', extract(dow from current_date + 7)::smallint, 'local_start_time', '14:00', 'local_end_time', '15:00',
            'timezone', 'Africa/Gaborone', 'format', 'online_group', 'slot_duration_minutes', 60,
            'lead_time_minutes', 0, 'buffer_before_minutes', 0, 'buffer_after_minutes', 0,
            'effective_from', current_date, 'effective_until', null
          )
        ),
        '[]'::jsonb,
        '{"subjects":[{"examination":"PSLE","subject":"Mathematics","price_credits":80}],"formats":[{"format":"online_1to1","group_capacity":1,"location_note":"Online"},{"format":"online_group","group_capacity":2,"location_note":"Online group"}]}'::jsonb
      )
    `);
    await db.query(
      "select public.record_verified_deposit($1, $2, 200, 'BOOKING-DEPOSIT-1', 'booking-deposit-001')",
      [
        "10000000-0000-4000-8000-000000000031",
        "10000000-0000-4000-8000-000000000033",
      ],
    );
    await db.query(
      "select public.record_verified_deposit($1, $2, 200, 'BOOKING-DEPOSIT-2', 'booking-deposit-002')",
      [
        "10000000-0000-4000-8000-000000000031",
        "10000000-0000-4000-8000-000000000034",
      ],
    );
    await db.query(
      "select public.record_verified_deposit($1, $2, 200, 'BOOKING-DEPOSIT-3', 'booking-deposit-003')",
      [
        "10000000-0000-4000-8000-000000000031",
        "10000000-0000-4000-8000-000000000035",
      ],
    );

    const slots = await db.query(`
      select * from public.list_tutor_slots(
        'booking-tutor', now(), now() + interval '14 days', 'online_1to1', 'PSLE', 'Mathematics'
      )
    `);
    assert.ok(slots.rows.length >= 2);
    assert.equal(slots.rows[0].price_credits, 80);
    await assert.rejects(
      db.query(
        "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          "10000000-0000-4000-8000-000000000036",
          "booking-tutor",
          "online_1to1",
          "PSLE",
          "Mathematics",
          slots.rows[1].starts_at,
          "Africa/Gaborone",
          null,
          "empty-wallet-booking",
        ],
      ),
      /Insufficient credits/,
    );
    const startsAt = slots.rows[0].starts_at;
    const args = [
      "10000000-0000-4000-8000-000000000033",
      "booking-tutor",
      "online_1to1",
      "PSLE",
      "Mathematics",
      startsAt,
      "Africa/Gaborone",
      null,
      "booking-request-001",
    ];
    const first = await db.query(
      "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9) as booking",
      args,
    );
    const replay = await db.query(
      "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9) as booking",
      args,
    );
    assert.equal(
      replay.rows[0].booking.bookingId,
      first.rows[0].booking.bookingId,
    );
    assert.equal(replay.rows[0].booking.replayed, true);
    const learnerWallet = async (learnerId) =>
      (
        await db.query(
          `
      select coalesce(balance.balance_credits, 0)::integer as balance
      from public.wallet_accounts wallet
      left join public.wallet_balances balance on balance.wallet_account_id = wallet.id
      where wallet.owner_user_id = $1
    `,
          [learnerId],
        )
      ).rows[0].balance;
    assert.equal(await learnerWallet(args[0]), 120);
    await assert.rejects(
      db.query(
        "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          "10000000-0000-4000-8000-000000000034",
          ...args.slice(1, 8),
          "booking-request-002",
        ],
      ),
      /no longer available/,
    );
    const bookingId = first.rows[0].booking.bookingId;
    const cancelled = await db.query(
      "select public.cancel_booking_with_refund($1, $2, 'Schedule changed', 'cancel-booking-001') as cancellation",
      [args[0], bookingId],
    );
    assert.equal(cancelled.rows[0].cancellation.status, "cancelled_by_learner");
    assert.equal(await learnerWallet(args[0]), 200);
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.ledger_transactions where booking_id = $1",
          [bookingId],
        )
      ).rows[0].count,
      2,
    );

    const groupSlots = await db.query(
      "select * from public.list_tutor_slots('booking-tutor', now(), now() + interval '14 days', 'online_group', 'PSLE', 'Mathematics')",
    );
    const groupStart = groupSlots.rows[0].starts_at;
    const groupBase = [
      "booking-tutor",
      "online_group",
      "PSLE",
      "Mathematics",
      groupStart,
      "Africa/Gaborone",
      null,
    ];
    const groupOne = await db.query(
      "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9) as booking",
      [args[0], ...groupBase, "group-booking-001"],
    );
    const groupTwo = await db.query(
      "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9) as booking",
      [
        "10000000-0000-4000-8000-000000000034",
        ...groupBase,
        "group-booking-002",
      ],
    );
    assert.equal(
      groupTwo.rows[0].booking.bookingId,
      groupOne.rows[0].booking.bookingId,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.booking_participants where booking_id = $1 and cancelled_at is null",
          [groupOne.rows[0].booking.bookingId],
        )
      ).rows[0].count,
      2,
    );
    await assert.rejects(
      db.query(
        "select public.create_confirmed_booking($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          "10000000-0000-4000-8000-000000000035",
          ...groupBase,
          "group-booking-003",
        ],
      ),
      /no longer available|group is full/,
    );
  } finally {
    await db.close();
  }
});

test("slot generation remains ordered across daylight-saving gaps and folds", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values ('10000000-0000-4000-8000-000000000041', '20000000-0000-4000-8000-000000000041', 'dst-tutor@example.test', 'DST Tutor', 'active', now());
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000041', 'approved');
      insert into public.tutor_profiles (id, tutor_user_id, approved_application_id, status, slug, headline, about, location, timezone, base_price_credits, published_at)
      values ('40000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000041', '30000000-0000-4000-8000-000000000041', 'active', 'dst-tutor', 'DST tutor', 'A sufficiently complete biography for daylight-saving tests.', 'Remote', 'America/New_York', 80, now());
      insert into public.tutor_profile_subjects (tutor_profile_id, examination, subject, price_credits)
      values ('40000000-0000-4000-8000-000000000041', 'PSLE', 'Mathematics', 80);
      insert into public.tutor_profile_formats (tutor_profile_id, format, group_capacity)
      values ('40000000-0000-4000-8000-000000000041', 'online_1to1', 1);
      insert into public.availability_rules (tutor_profile_id, weekday, local_start_time, local_end_time, timezone, format, slot_duration_minutes, lead_time_minutes, effective_from, effective_until)
      values
        ('40000000-0000-4000-8000-000000000041', 0, '01:00', '04:00', 'America/New_York', 'online_1to1', 60, 0, '2027-03-14', '2027-03-14'),
        ('40000000-0000-4000-8000-000000000041', 0, '00:00', '03:00', 'America/New_York', 'online_1to1', 60, 0, '2027-11-07', '2027-11-07');
    `);
    const spring = await db.query(
      "select starts_at, ends_at from public.list_tutor_slots('dst-tutor', '2027-03-14T00:00:00Z', '2027-03-15T00:00:00Z', 'online_1to1', 'PSLE', 'Mathematics')",
    );
    const fall = await db.query(
      "select starts_at, ends_at from public.list_tutor_slots('dst-tutor', '2027-11-07T00:00:00Z', '2027-11-08T00:00:00Z', 'online_1to1', 'PSLE', 'Mathematics')",
    );
    assert.equal(spring.rows.length, 2);
    assert.equal(fall.rows.length, 4);
    for (const rows of [spring.rows, fall.rows]) {
      assert.equal(
        new Set(rows.map((row) => new Date(row.starts_at).toISOString())).size,
        rows.length,
      );
      assert.ok(
        rows.every(
          (row) =>
            new Date(row.ends_at).getTime() -
              new Date(row.starts_at).getTime() ===
            3_600_000,
        ),
      );
      assert.ok(
        rows.every(
          (row, index) =>
            index === 0 ||
            new Date(row.starts_at) > new Date(rows[index - 1].starts_at),
        ),
      );
    }
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
      [
        "qualification",
        "tutor_qualification",
        "qualification.pdf",
        "application/pdf",
      ],
      ["profile_image", "profile_image", "profile.jpg", "image/jpeg"],
    ];
    for (const [documentType, kind, filename, contentType] of documents) {
      await db.query(
        `
        select public.register_tutor_application_document(
          $1, $2, $3, $4::public.object_kind, $5, $6, $7, 1024, repeat('a', 64), 'test-clean'
        )
      `,
        [
          "10000000-0000-4000-8000-000000000011",
          applicationId,
          documentType,
          kind,
          `applicant/${filename}`,
          filename,
          contentType,
        ],
      );
    }

    await db.query(
      "select public.transition_tutor_application($1, $2, 'submitted', null, null)",
      ["10000000-0000-4000-8000-000000000011", applicationId],
    );
    await assert.rejects(
      db.query(
        "select public.transition_tutor_application($1, $2, 'submitted', null, null)",
        ["10000000-0000-4000-8000-000000000011", applicationId],
      ),
      /Invalid or unauthorized/,
    );
    await assert.rejects(
      db.query(
        "select public.transition_tutor_application($1, $2, 'under_review', null, null)",
        ["10000000-0000-4000-8000-000000000011", applicationId],
      ),
      /Invalid or unauthorized/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.public_tutor_marketplace_profiles",
        )
      ).rows[0].count,
      0,
    );

    await db.query(
      "select public.transition_tutor_application($1, $2, 'under_review', 'Evidence opened', null)",
      ["10000000-0000-4000-8000-000000000012", applicationId],
    );
    await db.query(
      "select public.transition_tutor_application($1, $2, 'approved', 'Evidence verified', 'Your application is approved.')",
      ["10000000-0000-4000-8000-000000000012", applicationId],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.public_tutor_marketplace_profiles",
        )
      ).rows[0].count,
      1,
    );

    await db.query(
      "select public.transition_tutor_application($1, $2, 'suspended', 'Policy investigation', 'Your profile is temporarily suspended.')",
      ["10000000-0000-4000-8000-000000000012", applicationId],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.public_tutor_marketplace_profiles",
        )
      ).rows[0].count,
      0,
    );
    await db.exec(
      "update public.object_files set retention_until = now() - interval '1 day' where kind = 'tutor_identity'",
    );
    const expiredFile = (
      await db.query(
        "select id from public.object_files where kind = 'tutor_identity'",
      )
    ).rows[0];
    assert.equal(
      (
        await db.query(
          "select public.finalize_expired_object_deletion($1) as deleted",
          [expiredFile.id],
        )
      ).rows[0].deleted,
      true,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.audit_events where action = 'storage.retention_deleted'",
        )
      ).rows[0].count,
      1,
    );
  } finally {
    await db.close();
  }
});

test("confirmed online bookings create one Meet lifecycle record and cancellation revokes it", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000091', '20000000-0000-4000-8000-000000000091', 'meet-tutor@example.test', 'Meet Tutor', 'active', now()),
        ('10000000-0000-4000-8000-000000000092', '20000000-0000-4000-8000-000000000092', 'meet-learner@example.test', 'Meet Learner', 'active', now());
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000091', 'approved');
      insert into public.tutor_profiles (id, tutor_user_id, approved_application_id, status, slug, headline, about, location, base_price_credits)
      values ('40000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000091', 'active', 'meet-tutor', 'Meet tutor', 'Biography long enough for a persistent Meet lifecycle test.', 'Gaborone', 80);
      insert into public.bookings (id, tutor_profile_id, created_by_user_id, format, examination, subject, starts_at, ends_at, timezone, price_per_learner_credits, status, idempotency_key)
      values ('90000000-0000-4000-8000-000000000091', '40000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000092', 'online_1to1', 'PSLE', 'Mathematics', now() + interval '2 days', now() + interval '2 days 1 hour', 'Africa/Gaborone', 80, 'confirmed', 'meet-booking');
    `);
    assert.deepEqual(
      (
        await db.query(
          "select status, attempt_count from public.booking_meetings where booking_id = '90000000-0000-4000-8000-000000000091'",
        )
      ).rows[0],
      { status: "pending", attempt_count: 0 },
    );
    await db.exec(
      "update public.bookings set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' where id = '90000000-0000-4000-8000-000000000091'",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.booking_meetings where booking_id = '90000000-0000-4000-8000-000000000091'",
        )
      ).rows[0].count,
      1,
    );
    await db.exec(
      "update public.bookings set status = 'cancelled_by_learner' where id = '90000000-0000-4000-8000-000000000091'",
    );
    assert.equal(
      (
        await db.query(
          "select status from public.booking_meetings where booking_id = '90000000-0000-4000-8000-000000000091'",
        )
      ).rows[0].status,
      "revoked",
    );
  } finally {
    await db.close();
  }
});

test("messaging isolates conversations, deduplicates sends, and queues only verified WhatsApp channels", async () => {
  const db = new PGlite();
  try {
    await apply(db, await readMigrationFiles());
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000101', '20000000-0000-4000-8000-000000000101', 'message-tutor@example.test', 'Message Tutor', 'active', now()),
        ('10000000-0000-4000-8000-000000000102', '20000000-0000-4000-8000-000000000102', 'message-learner@example.test', 'Message Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000103', '20000000-0000-4000-8000-000000000103', 'other-learner@example.test', 'Other Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000104', '20000000-0000-4000-8000-000000000104', 'message-admin@example.test', 'Message Admin', 'active', now());
      insert into public.user_roles (user_id, role) values ('10000000-0000-4000-8000-000000000104', 'admin');
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', 'approved');
      insert into public.tutor_profiles (id, tutor_user_id, approved_application_id, status, slug, headline, about, location, base_price_credits)
      values ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000101', 'active', 'message-tutor', 'Message tutor', 'Biography long enough for durable messaging isolation tests.', 'Gaborone', 80);
    `);
    const learner = "10000000-0000-4000-8000-000000000102";
    const otherLearner = "10000000-0000-4000-8000-000000000103";
    const tutor = "10000000-0000-4000-8000-000000000101";
    const first = await db.query(
      "select public.start_tutor_conversation($1, 'message-tutor') as id",
      [learner],
    );
    const replay = await db.query(
      "select public.start_tutor_conversation($1, 'message-tutor') as id",
      [learner],
    );
    assert.equal(replay.rows[0].id, first.rows[0].id);
    const conversationId = first.rows[0].id;
    const sent = await db.query(
      "select public.send_conversation_message($1, $2, 'Can we review fractions?', 'client-message-001') as id",
      [learner, conversationId],
    );
    const sentReplay = await db.query(
      "select public.send_conversation_message($1, $2, 'Can we review fractions?', 'client-message-001') as id",
      [learner, conversationId],
    );
    assert.equal(sentReplay.rows[0].id, sent.rows[0].id);
    await assert.rejects(
      db.query(
        "select public.send_conversation_message($1, $2, 'Show me another learner message', 'client-message-idor')",
        [otherLearner, conversationId],
      ),
      /Conversation not found/,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.message_deliveries",
        )
      ).rows[0].count,
      0,
    );

    await db.exec(`
      insert into public.tutor_messaging_channels (tutor_profile_id, provider, recipient_e164, status, verified_by_user_id, verified_at)
      values ('40000000-0000-4000-8000-000000000101', 'whatsapp', '+26771234567', 'verified', '10000000-0000-4000-8000-000000000104', now());
    `);
    await db.query(
      "select public.send_conversation_message($1, $2, 'Second question', 'client-message-002')",
      [learner, conversationId],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.message_deliveries where status = 'queued'",
        )
      ).rows[0].count,
      1,
    );

    await db.query(
      "insert into public.contact_blocks (blocker_user_id, blocked_user_id, conversation_id, reason) values ($1, $2, $3, 'No further contact')",
      [learner, tutor, conversationId],
    );
    await assert.rejects(
      db.query(
        "select public.send_conversation_message($1, $2, 'Blocked message', 'client-message-003')",
        [tutor, conversationId],
      ),
      /Messaging is blocked/,
    );
  } finally {
    await db.close();
  }
});
