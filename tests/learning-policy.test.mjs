import assert from "node:assert/strict";
import test from "node:test";
import { normalizeContentCommand, normalizeCoursePurchase, normalizeFavourite, normalizeQuizAttempt, normalizeReferralCode } from "../server/learning/policy.mjs";

test("course purchases require a normalized course and stable idempotency key", () => {
  assert.deepEqual(normalizeCoursePurchase({ courseSlug: " PSLE Mathematics ", idempotencyKey: " purchase:123456789 " }), {
    value: { courseSlug: "psle-mathematics", idempotencyKey: "purchase:123456789" }, errors: []
  });
  assert.equal(normalizeCoursePurchase({ courseSlug: "", idempotencyKey: "short" }).errors.length, 2);
});

test("quiz attempts accept UUID answers once and reject client score fields", () => {
  const valid = normalizeQuizAttempt({
    lessonId: "60000000-0000-4000-8000-000000000001", idempotencyKey: "quiz-attempt:123456",
    score: 100,
    answers: [{ questionId: "70000000-0000-4000-8000-000000000001", optionId: "80000000-0000-4000-8000-000000000001" }]
  });
  assert.deepEqual(valid.errors, []);
  assert.equal("score" in valid.value, false);
  const duplicate = normalizeQuizAttempt({ ...valid.value, answers: [valid.value.answers[0], valid.value.answers[0]] });
  assert.match(duplicate.errors.join(" "), /once/);
});

test("referrals and favourites use server-owned identifiers", () => {
  assert.deepEqual(normalizeReferralCode(" stud-abcd12 "), { code: "STUD-ABCD12", valid: true });
  assert.equal(normalizeReferralCode("bad").valid, false);
  assert.equal(normalizeFavourite({ tutorProfileId: "40000000-0000-4000-8000-000000000001" }).valid, true);
  assert.equal(normalizeFavourite({ tutorProfileId: "demo-tutor" }).valid, false);
});

test("content commands validate drafts and correct answer positions", () => {
  assert.deepEqual(normalizeContentCommand({ action: "createCourse", course: {
    title: "PSLE Mathematics", examination: "PSLE", subject: "Mathematics",
    description: "A complete reviewed course description for learners.", priceCredits: 140, themeColor: "#dbeafe"
  } }).errors, []);
  assert.deepEqual(normalizeContentCommand({ action: "createLesson", lesson: {
    courseId: "50000000-0000-4000-8000-000000000001", title: "Fractions", duration: "15 min",
    description: "A complete lesson summary.", revisionTitle: "Revision paper", revisionContent: "Reviewed notes",
    questions: [{ prompt: "What is one half?", options: ["0.5", "5"], correctIndex: 0 }]
  } }).errors, []);
  assert.ok(normalizeContentCommand({ action: "createLesson", lesson: { questions: [{ prompt: "x", options: ["a"], correctIndex: 9 }] } }).errors.length);
});
