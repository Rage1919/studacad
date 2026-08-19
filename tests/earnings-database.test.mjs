import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

test("earnings release, refunds, payout failure, retry, and settlement remain balanced and idempotent", async () => {
  const db = new PGlite();
  try {
    for (const migration of await readMigrationFiles())
      await db.exec(migration.sql);
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at) values
        ('10000000-0000-4000-8000-000000000071','20000000-0000-4000-8000-000000000071','admin71@example.test','Admin','active',now()),
        ('10000000-0000-4000-8000-000000000072','20000000-0000-4000-8000-000000000072','tutor72@example.test','Tutor','active',now()),
        ('10000000-0000-4000-8000-000000000073','20000000-0000-4000-8000-000000000073','learner73@example.test','Learner','active',now());
      insert into public.user_roles (user_id,role) values
        ('10000000-0000-4000-8000-000000000071','admin'),('10000000-0000-4000-8000-000000000072','tutor'),('10000000-0000-4000-8000-000000000073','learner');
      insert into public.tutor_applications (id,applicant_user_id,status) values ('30000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000072','approved');
      insert into public.tutor_profiles (id,tutor_user_id,approved_application_id,status,slug,headline,about,location,base_price_credits) values
        ('40000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000072','30000000-0000-4000-8000-000000000071','active','earning-tutor','Earning tutor','A complete tutor biography for financial tests.','Gaborone',200);
      insert into public.bookings (id,tutor_profile_id,created_by_user_id,format,examination,subject,starts_at,ends_at,timezone,price_per_learner_credits,status,idempotency_key) values
        ('90000000-0000-4000-8000-000000000071','40000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000073','online_1to1','PSLE','Mathematics',now()-interval '9 days',now()-interval '8 days','Africa/Gaborone',200,'confirmed','earnings-booking-1');
      insert into public.booking_participants (booking_id,learner_user_id) values ('90000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000073');
      insert into public.wallet_accounts (owner_user_id) values ('10000000-0000-4000-8000-000000000073');
      insert into public.wallet_accounts (system_code) values ('booking_escrow'),('test_issuance');
      insert into public.ledger_transactions (id,kind,idempotency_key,description,booking_id,actor_user_id,metadata) values
        ('80000000-0000-4000-8000-000000000071','hold','earnings-hold-1','Booking hold','90000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000073',jsonb_build_object('learnerUserId','10000000-0000-4000-8000-000000000073','priceCredits',200));
      insert into public.ledger_entries (transaction_id,wallet_account_id,amount_credits)
      select '80000000-0000-4000-8000-000000000071',id,case when system_code='booking_escrow' then 200 else -200 end from public.wallet_accounts where system_code in ('booking_escrow','test_issuance');
      update public.bookings set status='completed',completed_at=now() where id='90000000-0000-4000-8000-000000000071';
    `);
    assert.equal(
      (
        await db.query(
          "select public.release_available_tutor_earnings(10) as count",
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await db.query(
          "select public.release_available_tutor_earnings(10) as count",
        )
      ).rows[0].count,
      0,
    );
    const earning = (await db.query("select * from public.tutor_earnings"))
      .rows[0];
    assert.equal(earning.released_gross_credits, 200);
    assert.equal(earning.released_platform_fee_credits, 40);
    assert.equal(earning.released_net_credits, 160);
    const destination = (
      await db.query(
        "select public.verify_tutor_payout_destination($1,$2,'manual_bank','Bank •••• 1234','KYC-CASE-71') as id",
        [
          "10000000-0000-4000-8000-000000000071",
          "10000000-0000-4000-8000-000000000072",
        ],
      )
    ).rows[0].id;
    const args = [
      "10000000-0000-4000-8000-000000000072",
      destination,
      100,
      "payout-request-71",
    ];
    const payout = (
      await db.query(
        "select public.request_tutor_payout($1,$2,$3,$4) as id",
        args,
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query(
          "select public.request_tutor_payout($1,$2,$3,$4) as id",
          args,
        )
      ).rows[0].id,
      payout,
    );
    await db.query(
      "select public.admin_transition_tutor_payout($1,$2,'reviewing')",
      ["10000000-0000-4000-8000-000000000071", payout],
    );
    await db.query(
      "select public.admin_transition_tutor_payout($1,$2,'processing')",
      ["10000000-0000-4000-8000-000000000071", payout],
    );
    await db.query(
      "select public.admin_transition_tutor_payout($1,$2,'failed',null,'Provider rejected transfer')",
      ["10000000-0000-4000-8000-000000000071", payout],
    );
    assert.equal(
      (
        await db.query(
          "select public.tutor_payout_available_credits($1) as credits",
          ["10000000-0000-4000-8000-000000000072"],
        )
      ).rows[0].credits,
      160,
    );
    await db.query(
      "select public.admin_transition_tutor_payout($1,$2,'processing')",
      ["10000000-0000-4000-8000-000000000071", payout],
    );
    await db.query(
      "select public.admin_transition_tutor_payout($1,$2,'paid','SETTLEMENT-71')",
      ["10000000-0000-4000-8000-000000000071", payout],
    );
    assert.equal(
      (
        await db.query(
          "select public.tutor_payout_available_credits($1) as credits",
          ["10000000-0000-4000-8000-000000000072"],
        )
      ).rows[0].credits,
      60,
    );
    const refundArgs = [
      "10000000-0000-4000-8000-000000000071",
      "90000000-0000-4000-8000-000000000071",
      "10000000-0000-4000-8000-000000000073",
      50,
      "Partial support refund",
      "refund-request-71",
    ];
    const refund = (
      await db.query(
        "select public.admin_refund_booking($1,$2,$3,$4,$5,$6) as id",
        refundArgs,
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query(
          "select public.admin_refund_booking($1,$2,$3,$4,$5,$6) as id",
          refundArgs,
        )
      ).rows[0].id,
      refund,
    );
    await assert.rejects(
      db.query(
        "select public.admin_refund_booking($1,$2,$3,151,$4,'refund-over-71')",
        [...refundArgs.slice(0, 3), refundArgs[4]],
      ),
      /exceeds/,
    );
    assert.equal(
      (
        await db.query(
          "select sum(amount_credits)::integer as net from public.ledger_entries",
        )
      ).rows[0].net,
      0,
    );
  } finally {
    await db.close();
  }
});
