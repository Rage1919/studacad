import assert from "node:assert/strict";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";

test("notification outbox deduplicates, applies preferences, recomputes reminders, isolates reads, and dead-letters", async () => {
  const db = new PGlite();
  try {
    for (const migration of await readMigrationFiles())
      await db.exec(migration.sql);
    await db.exec(`
      insert into public.user_accounts(id,auth_subject,email,display_name,status,email_verified_at,timezone) values
      ('10000000-0000-4000-8000-000000000081','20000000-0000-4000-8000-000000000081','learner81@example.test','Learner','active',now(),'Africa/Gaborone'),
      ('10000000-0000-4000-8000-000000000082','20000000-0000-4000-8000-000000000082','tutor82@example.test','Tutor','active',now(),'Africa/Gaborone');
      insert into public.user_roles(user_id,role) values ('10000000-0000-4000-8000-000000000081','learner'),('10000000-0000-4000-8000-000000000082','tutor');
      insert into public.tutor_applications(id,applicant_user_id,status) values ('30000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000082','approved');
      insert into public.tutor_profiles(id,tutor_user_id,approved_application_id,status,slug,headline,about,location,base_price_credits) values
      ('40000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000082','30000000-0000-4000-8000-000000000081','active','notify-tutor','Notification tutor','A complete tutor profile for notification tests.','Gaborone',100);
      insert into public.bookings(id,tutor_profile_id,created_by_user_id,format,examination,subject,starts_at,ends_at,timezone,price_per_learner_credits,status,idempotency_key) values
      ('90000000-0000-4000-8000-000000000081','40000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081','online_1to1','PSLE','Mathematics',now()+interval '3 days',now()+interval '3 days 1 hour','Africa/Gaborone',100,'confirmed','notify-booking');
      insert into public.booking_participants(booking_id,learner_user_id) values ('90000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081');
    `);
    const initial = await db.query(
      "select template_key,channel,status,recipient_timezone from public.notifications where user_id=$1 order by template_key,channel",
      ["10000000-0000-4000-8000-000000000081"],
    );
    assert.equal(initial.rows.length, 6);
    assert.ok(
      initial.rows.every((row) => row.recipient_timezone === "Africa/Gaborone"),
    );
    assert.equal(
      initial.rows.find(
        (row) =>
          row.template_key === "booking.confirmed" && row.channel === "in_app",
      ).status,
      "sent",
    );
    await db.query(
      "select public.enqueue_user_notification($1,'booking','booking.confirmed','{}','duplicate-event',true,now())",
      ["10000000-0000-4000-8000-000000000081"],
    );
    await db.query(
      "select public.enqueue_user_notification($1,'booking','booking.confirmed','{}','duplicate-event',true,now())",
      ["10000000-0000-4000-8000-000000000081"],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.notifications where event_key='duplicate-event'",
        )
      ).rows[0].count,
      2,
    );
    const oldKeys = (
      await db.query(
        "select idempotency_key from public.notifications where category='booking_reminder'",
      )
    ).rows.map((row) => row.idempotency_key);
    await db.exec(
      "update public.bookings set starts_at=starts_at+interval '1 day',ends_at=ends_at+interval '1 day' where id='90000000-0000-4000-8000-000000000081'",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::integer as count from public.notifications where idempotency_key=any($1) and delivery_disposition='booking_changed'",
          [oldKeys],
        )
      ).rows[0].count,
      4,
    );
    await db.query(
      "select public.set_notification_preference($1,'new_message','email',false)",
      ["10000000-0000-4000-8000-000000000081"],
    );
    await db.exec(`insert into public.conversations(id,kind,created_by_user_id,subject) values ('70000000-0000-4000-8000-000000000081','support','10000000-0000-4000-8000-000000000081','Support');
      insert into public.conversation_participants(conversation_id,user_id) values ('70000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081'),('70000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000082');
      insert into public.messages(conversation_id,sender_user_id,body,client_idempotency_key,status) values ('70000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000082','Private message content','notify-message-81','sent');`);
    await db.query("select * from public.claim_notifications(100,$1)", [
      "60000000-0000-4000-8000-000000000081",
    ]);
    assert.equal(
      (
        await db.query(
          "select delivery_disposition from public.notifications where template_key='message.received' and channel='email'",
        )
      ).rows[0].delivery_disposition,
      "preference_disabled",
    );
    const inApp = (
      await db.query(
        "select id from public.notifications where template_key='message.received' and channel='in_app'",
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select public.mark_notification_read($1,$2) as ok", [
          "10000000-0000-4000-8000-000000000082",
          inApp,
        ])
      ).rows[0].ok,
      false,
    );
    assert.equal(
      (
        await db.query("select public.mark_notification_read($1,$2) as ok", [
          "10000000-0000-4000-8000-000000000081",
          inApp,
        ])
      ).rows[0].ok,
      true,
    );
    await db.query(
      "select public.enqueue_user_notification($1,'booking','booking.confirmed','{}','dead-letter-event',true,now())",
      ["10000000-0000-4000-8000-000000000081"],
    );
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const token = `60000000-0000-4000-8000-${String(attempt).padStart(12, "0")}`;
      const row = (
        await db.query(
          "select id,channel from public.claim_notifications(100,$1) where event_key='dead-letter-event' and channel='email'",
          [token],
        )
      ).rows[0];
      assert.ok(row);
      await db.query(
        "select public.complete_notification($1,$2,'retry',null,'provider_down')",
        [row.id, token],
      );
      await db.query(
        "update public.notifications set next_retry_at=now() where id=$1",
        [row.id],
      );
    }
    assert.ok(
      (
        await db.query(
          "select dead_lettered_at from public.notifications where event_key='dead-letter-event' and channel='email'",
        )
      ).rows[0].dead_lettered_at,
    );
  } finally {
    await db.close();
  }
});
