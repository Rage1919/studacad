import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeAdminCase,
  normalizeCaseMessage,
  normalizeSupportCase,
  normalizeTutorReport,
} from "../server/support/policy.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("support request validation accepts bounded valid input and rejects unsafe input", () => {
  assert.deepEqual(
    normalizeSupportCase({
      category: "safety",
      subject: "Urgent lesson concern",
      message: "I need the safeguarding team to review this lesson.",
      bookingId: "90000000-0000-4000-8000-000000000001",
    }).errors,
    [],
  );
  assert.ok(
    normalizeSupportCase({ category: "other", subject: "x", message: "short" })
      .errors.length >= 2,
  );
  assert.deepEqual(
    normalizeCaseMessage({
      caseId: "90000000-0000-4000-8000-000000000001",
      message: "Additional private detail",
    }).errors,
    [],
  );
  assert.ok(
    normalizeCaseMessage({ caseId: "not-an-id", message: "no" }).errors
      .length >= 2,
  );
  assert.deepEqual(
    normalizeTutorReport({ reason: "This conduct needs a private review." })
      .errors,
    [],
  );
  assert.ok(normalizeTutorReport({ reason: "brief" }).errors.length);
  assert.deepEqual(
    normalizeAdminCase({
      caseId: "90000000-0000-4000-8000-000000000001",
      status: "triaged",
      priority: "high",
      assigneeId: "10000000-0000-4000-8000-000000000001",
      note: "Owner assigned",
    }).errors,
    [],
  );
});

test("every published policy route and footer destination exists", async () => {
  const routes = [
    "privacy",
    "terms",
    "tutor-agreement",
    "community-guidelines",
    "safety",
    "cancellation-refunds",
    "cookies",
    "accessibility",
    "help",
    "contact",
  ];
  await Promise.all(routes.map((route) => read(`app/${route}/page.tsx`)));
  const footer = await read("app/components/StudacadFooter.tsx");
  for (const route of routes)
    assert.match(footer, new RegExp(`href=["']/${route}["']`));
  assert.doesNotMatch(footer, /Demo experience/i);
});

test("registration, booking, course purchase, and tutor submission require policy acceptance", async () => {
  const [registration, booking, purchase, tutor, migration] = await Promise.all(
    [
      read("app/api/auth/email/route.ts"),
      read("app/api/bookings/route.ts"),
      read("app/api/lms/purchases/route.ts"),
      read("app/tutor/page.tsx"),
      read("supabase/migrations/20260819001300_legal_support.sql"),
    ],
  );
  assert.match(registration, /acceptPolicies/);
  assert.match(registration, /studacad_policy_version/);
  assert.match(booking, /acceptPolicies/);
  assert.match(booking, /cancellation_refunds/);
  assert.match(purchase, /course_purchase/);
  assert.match(tutor, /acceptPolicies:\s*true/);
  assert.match(migration, /accept_tutor_agreement_on_submission/);
});

test("policy register hashes match the published policy sources", async () => {
  const mapping = {
    privacy: "privacy",
    terms: "terms",
    tutor_agreement: "tutor-agreement",
    community_guidelines: "community-guidelines",
    safety: "safety",
    cancellation_refunds: "cancellation-refunds",
    cookies: "cookies",
    accessibility: "accessibility",
  };
  const migration = await read(
    "supabase/migrations/20260819001300_legal_support.sql",
  );
  for (const [key, route] of Object.entries(mapping)) {
    const source = await read(`app/${route}/page.tsx`);
    const normalizedSource = source.replaceAll("\r\n", "\n");
    const hash = createHash("sha256").update(normalizedSource).digest("hex");
    assert.match(
      migration,
      new RegExp(`\\('${key}','2026-08-20',[^\\n]+,'${hash}'\\)`),
      `${key} policy hash must match its published source`,
    );
  }
});
