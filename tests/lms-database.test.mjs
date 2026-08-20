import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

test("LMS purchases, scoring, progress, and referrals are authoritative and idempotent", async () => {
  const db = new PGlite();
  try {
    for (const migration of await readMigrationFiles()) await db.exec(migration.sql);
    await db.exec(`
      insert into public.user_accounts (id, auth_subject, email, display_name, status, email_verified_at)
      values
        ('10000000-0000-4000-8000-000000000051', '20000000-0000-4000-8000-000000000051', 'lms-admin@example.test', 'LMS Admin', 'active', now()),
        ('10000000-0000-4000-8000-000000000052', '20000000-0000-4000-8000-000000000052', 'lms-learner@example.test', 'LMS Learner', 'active', now()),
        ('10000000-0000-4000-8000-000000000053', '20000000-0000-4000-8000-000000000053', 'lms-referrer@example.test', 'LMS Referrer', 'active', now()),
        ('10000000-0000-4000-8000-000000000054', '20000000-0000-4000-8000-000000000054', 'lms-tutor@example.test', 'LMS Tutor', 'active', now());
      insert into public.user_roles (user_id, role)
      values
        ('10000000-0000-4000-8000-000000000051', 'admin'),
        ('10000000-0000-4000-8000-000000000052', 'learner'),
        ('10000000-0000-4000-8000-000000000053', 'learner'),
        ('10000000-0000-4000-8000-000000000054', 'tutor');
    `);

    const course = await db.query(`select public.admin_create_course($1, $2::jsonb) as id`, [
      "10000000-0000-4000-8000-000000000051",
      JSON.stringify({ slug: "lms-test-course", title: "LMS Test Course", examination: "PSLE", subject: "Mathematics", description: "A complete course used to verify persistent learning behavior.", priceCredits: 140, themeColor: "#dbeafe" })
    ]);
    const courseId = course.rows[0].id;
    const lesson = await db.query(`select public.admin_create_lesson($1, $2::jsonb) as id`, [
      "10000000-0000-4000-8000-000000000051",
      JSON.stringify({ courseId, slug: "authoritative-scoring", title: "Authoritative scoring", description: "The server verifies every selected option.", durationMinutes: 15, videoUrl: "", revisionTitle: "Scoring notes", revisionContent: "Review before answering.", questions: [{ prompt: "What is 2 + 2?", options: ["3", "4", "5"], correctIndex: 1 }] })
    ]);
    const lessonId = lesson.rows[0].id;
    await db.query("select public.admin_set_lesson_status($1, $2, 'published')", ["10000000-0000-4000-8000-000000000051", lessonId]);
    await db.query("select public.admin_set_course_status($1, $2, 'published')", ["10000000-0000-4000-8000-000000000051", courseId]);
    assert.equal((await db.query("select count(*)::integer as count from public.audit_events where action in ('course.created','lesson.created','course.status_changed','lesson.status_changed')")).rows[0].count, 4);

    await db.query("select public.record_verified_deposit($1, $2, 1000, 'LMS-DEPOSIT-1', 'lms-deposit-0001')", ["10000000-0000-4000-8000-000000000051", "10000000-0000-4000-8000-000000000052"]);
    const purchaseArgs = ["10000000-0000-4000-8000-000000000052", "lms-test-course", "course-purchase:0001"];
    const purchased = await db.query("select public.purchase_course($1, $2, $3) as result", purchaseArgs);
    const replay = await db.query("select public.purchase_course($1, $2, $3) as result", purchaseArgs);
    assert.equal(replay.rows[0].result.purchaseId, purchased.rows[0].result.purchaseId);
    assert.equal(replay.rows[0].result.replayed, true);
    const learnerBalance = await db.query(`select balance_credits::integer as balance from public.wallet_balances balance join public.wallet_accounts wallet on wallet.id = balance.wallet_account_id where wallet.owner_user_id = $1`, ["10000000-0000-4000-8000-000000000052"]);
    assert.equal(learnerBalance.rows[0].balance, 860);

    const answer = (await db.query(`select question.id as question_id, option.id as option_id from public.quiz_questions question join public.quiz_options option on option.question_id = question.id where question.lesson_id = $1 and option.is_correct`, [lessonId])).rows[0];
    const attemptArgs = ["10000000-0000-4000-8000-000000000052", lessonId, JSON.stringify([{ questionId: answer.question_id, optionId: answer.option_id }]), "quiz-attempt:000001"];
    const attempt = await db.query("select public.submit_quiz_attempt($1, $2, $3::jsonb, $4) as result", attemptArgs);
    assert.equal(attempt.rows[0].result.scorePercent, 100);
    assert.equal(attempt.rows[0].result.passed, true);
    assert.equal((await db.query("select status from public.lesson_progress where learner_user_id = $1 and lesson_id = $2", attemptArgs.slice(0, 2))).rows[0].status, "completed");
    const attemptReplay = await db.query("select public.submit_quiz_attempt($1, $2, $3::jsonb, $4) as result", attemptArgs);
    assert.equal(attemptReplay.rows[0].result.replayed, true);
    assert.equal((await db.query("select count(*)::integer as count from public.quiz_attempts")).rows[0].count, 1);

    const referralCode = (await db.query("select public.get_or_create_referral_code($1) as code", ["10000000-0000-4000-8000-000000000053"])).rows[0].code;
    await db.query("select public.attach_referral_code($1, $2)", ["10000000-0000-4000-8000-000000000052", referralCode]);
    await assert.rejects(db.query("select public.attach_referral_code($1, $2)", ["10000000-0000-4000-8000-000000000053", referralCode]), /Self-referral/);
    await db.exec(`
      insert into public.tutor_applications (id, applicant_user_id, status)
      values ('30000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000054', 'approved');
      insert into public.tutor_profiles (id, tutor_user_id, approved_application_id, status, slug, headline, about, location, base_price_credits)
      values ('40000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000054', '30000000-0000-4000-8000-000000000051', 'active', 'lms-tutor', 'LMS tutor', 'A complete tutor biography for the LMS referral test.', 'Gaborone', 80);
      insert into public.bookings (id, tutor_profile_id, created_by_user_id, format, examination, subject, starts_at, ends_at, timezone, price_per_learner_credits, status, idempotency_key)
      values ('90000000-0000-4000-8000-000000000051', '40000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000052', 'online_1to1', 'PSLE', 'Mathematics', now() - interval '2 hours', now() - interval '1 hour', 'Africa/Gaborone', 80, 'confirmed', 'lms-referral-booking');
      insert into public.booking_participants (booking_id, learner_user_id)
      values ('90000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000052');
      update public.bookings set status = 'completed', completed_at = now() where id = '90000000-0000-4000-8000-000000000051';
    `);
    assert.equal((await db.query("select count(*)::integer as count from public.referral_rewards where status = 'earned'")).rows[0].count, 1);
    const referrerBalance = await db.query(`select balance_credits::integer as balance from public.wallet_balances balance join public.wallet_accounts wallet on wallet.id = balance.wallet_account_id where wallet.owner_user_id = $1`, ["10000000-0000-4000-8000-000000000053"]);
    assert.equal(referrerBalance.rows[0].balance, 50);
    const balanced = await db.query("select sum(amount_credits)::integer as net from public.ledger_entries entry join public.ledger_transactions transaction on transaction.id = entry.transaction_id where transaction.kind in ('purchase','reward')");
    assert.equal(balanced.rows[0].net, 0);
  } finally { await db.close(); }
});
