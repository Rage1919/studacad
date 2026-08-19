import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

const admin = "10000000-0000-4000-8000-000000000131";
const learner = "10000000-0000-4000-8000-000000000132";
const other = "10000000-0000-4000-8000-000000000133";
const tutor = "10000000-0000-4000-8000-000000000134";

async function setup() {
  const db = new PGlite();
  for (const migration of await readMigrationFiles())
    await db.exec(migration.sql);
  await db.exec(`
    insert into public.user_accounts(id,auth_subject,email,display_name,status,email_verified_at) values
    ('${admin}','20000000-0000-4000-8000-000000000131','support-admin@example.test','Support Admin','active',now()),
    ('${learner}','20000000-0000-4000-8000-000000000132','support-learner@example.test','Support Learner','active',now()),
    ('${other}','20000000-0000-4000-8000-000000000133','support-other@example.test','Other Learner','active',now()),
    ('${tutor}','20000000-0000-4000-8000-000000000134','support-tutor@example.test','Support Tutor','active',now());
    insert into public.user_roles(user_id,role) values
    ('${admin}','admin'),('${learner}','learner'),('${other}','learner'),('${tutor}','tutor');
    insert into public.tutor_applications(id,applicant_user_id,status)
    values ('30000000-0000-4000-8000-000000000131','${tutor}','approved');
    insert into public.tutor_profiles(id,tutor_user_id,approved_application_id,status,slug,headline,about,location,base_price_credits)
    values ('40000000-0000-4000-8000-000000000131','${tutor}','30000000-0000-4000-8000-000000000131','active','support-tutor','Support tutor','A complete tutor biography for support tests.','Gaborone',100);
  `);
  return db;
}

test("policy acceptance is versioned, idempotent, and append-only", async () => {
  const db = await setup();
  try {
    const args = [learner, ["terms", "privacy"], "account", "account-settings"];
    assert.equal(
      (
        await db.query(
          "select public.accept_current_policies($1,$2,$3,$4) as count",
          args,
        )
      ).rows[0].count,
      2,
    );
    await db.query("select public.accept_current_policies($1,$2,$3,$4)", args);
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.user_policy_acceptances where user_id=$1",
          [learner],
        )
      ).rows[0].count,
      2,
    );
    await assert.rejects(
      db.exec(
        "update public.user_policy_acceptances set context_reference='changed'",
      ),
      /append-only/,
    );
  } finally {
    await db.close();
  }
});

test("support cases have references, response targets, private messages, ownership, and audit events", async () => {
  const db = await setup();
  try {
    const normal = (
      await db.query(
        "select public.create_support_case($1,'technical','Cannot open lesson','The lesson page does not load for me.',null) as number",
        [learner],
      )
    ).rows[0].number;
    assert.match(normal, /^STU-[0-9]{6}-[0-9]{6}$/);
    const urgent = (
      await db.query(
        "select public.create_support_case($1,'safety','Urgent safety concern','Please review this safeguarding concern privately.',null) as number",
        [learner],
      )
    ).rows[0].number;
    const cases = await db.query(
      "select id,case_number,priority,response_due_at-created_at as target from public.support_cases order by created_at",
    );
    assert.equal(
      cases.rows.find((row) => row.case_number === normal).priority,
      "normal",
    );
    const safety = cases.rows.find((row) => row.case_number === urgent);
    assert.equal(safety.priority, "urgent");
    assert.equal(safety.target, "04:00:00");

    await assert.rejects(
      db.query(
        "select public.add_support_case_message($1,$2,'Attempted cross-account access',false)",
        [other, safety.id],
      ),
      /access denied/,
    );
    await assert.rejects(
      db.query(
        "select public.add_support_case_message($1,$2,'Hidden learner note',true)",
        [learner, safety.id],
      ),
      /access denied/,
    );
    await db.query(
      "select public.admin_update_support_case($1,$2,'triaged','high',$1,'We have started a private review.')",
      [admin, safety.id],
    );
    assert.deepEqual(
      (
        await db.query(
          "select status,priority,assigned_to_user_id from public.support_cases where id=$1",
          [safety.id],
        )
      ).rows[0],
      { status: "triaged", priority: "high", assigned_to_user_id: admin },
    );
    assert.ok(
      (
        await db.query(
          "select count(*)::integer as count from public.audit_events where entity_id=$1",
          [safety.id],
        )
      ).rows[0].count >= 3,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.notifications where user_id=$1 and template_key='support.case_updated'",
          [learner],
        )
      ).rows[0].count,
      2,
    );
  } finally {
    await db.close();
  }
});

test("tutor reports create linked private cases and reject self-reporting", async () => {
  const db = await setup();
  try {
    const number = (
      await db.query(
        "select public.report_tutor($1,'support-tutor','The tutor conduct needs a private safety review.',null) as number",
        [learner],
      )
    ).rows[0].number;
    const report = (
      await db.query(
        "select report.support_case_id,case_record.case_number from public.tutor_reports report join public.support_cases case_record on case_record.id=report.support_case_id",
      )
    ).rows[0];
    assert.equal(report.case_number, number);
    await assert.rejects(
      db.query(
        "select public.report_tutor($1,'support-tutor','A self report should never be accepted.',null)",
        [tutor],
      ),
      /Valid tutor report required/,
    );
  } finally {
    await db.close();
  }
});

test("only administrators can record immutable review attestations", async () => {
  const db = await setup();
  try {
    const nextReview = new Date(Date.now() + 180 * 86_400_000).toISOString();
    await assert.rejects(
      db.query(
        "select public.record_policy_review($1,'2026-08-20','owner','Product Owner','approved','owner-review-001',$2)",
        [learner, nextReview],
      ),
      /Administrator role required/,
    );
    const id = (
      await db.query(
        "select public.record_policy_review($1,'2026-08-20','owner','Product Owner','approved','owner-review-001',$2) as id",
        [admin, nextReview],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("delete from public.policy_reviews where id=$1", [id]),
      /append-only/,
    );
  } finally {
    await db.close();
  }
});
