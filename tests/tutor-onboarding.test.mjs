import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationIsEditable,
  canTransitionApplication,
  contentMatchesSignature,
  normalizeApplicationPayload,
  validateApplicationPayload,
  validateUploadMetadata
} from "../server/tutor-onboarding/policy.mjs";
import { scanUpload } from "../server/tutor-onboarding/malware-scanner.mjs";

const completePayload = normalizeApplicationPayload({
  legalName: "Masego Tutor", phone: "71234567", district: "South-East", town: "Gaborone",
  headline: "Patient mathematics tutor for Botswana learners",
  biography: "I use careful explanations, worked examples, and exam-style practice to help every learner build confidence and answer questions independently.",
  teachingExperience: "3–5 years", qualification: "Bachelor of Education", institution: "University of Botswana",
  languages: "English, Setswana", levels: ["PSLE"], subjects: ["Mathematics"], formats: ["online_1to1"],
  basePriceCredits: 80, sessionDurationMinutes: 60, days: ["Mon", "Wed"], startTime: "16:00", endTime: "19:00", consent: true
});

test("tutor application transitions deny escalation and duplicate submissions", () => {
  assert.equal(canTransitionApplication("draft", "submitted", "applicant"), true);
  assert.equal(canTransitionApplication("submitted", "submitted", "applicant"), false);
  assert.equal(canTransitionApplication("submitted", "approved", "applicant"), false);
  assert.equal(canTransitionApplication("submitted", "under_review", "reviewer"), true);
  assert.equal(canTransitionApplication("under_review", "approved", "reviewer"), true);
  assert.equal(applicationIsEditable("changes_requested"), true);
  assert.equal(applicationIsEditable("under_review"), false);
});

test("submission validation covers contact, teaching, pricing, availability, and consent", () => {
  assert.deepEqual(validateApplicationPayload(completePayload, { submission: true }), []);
  const invalid = normalizeApplicationPayload({ ...completePayload, phone: "123", subjects: [], basePriceCredits: 20, consent: false });
  const problems = validateApplicationPayload(invalid, { submission: true });
  assert.ok(problems.some(problem => /mobile/i.test(problem)));
  assert.ok(problems.some(problem => /subject/i.test(problem)));
  assert.ok(problems.some(problem => /rate/i.test(problem)));
  assert.ok(problems.some(problem => /consent/i.test(problem)));
});

test("unsafe tutor uploads fail type, size, signature, and malware checks", async () => {
  assert.deepEqual(validateUploadMetadata("identity", { type: "text/html", size: 100 }), ["This file type is not allowed."]);
  assert.ok(validateUploadMetadata("profile_image", { type: "image/png", size: 6_000_000 })[0].includes("5 MB"));
  assert.equal(contentMatchesSignature(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png"), true);
  assert.equal(contentMatchesSignature(new TextEncoder().encode("<script>"), "image/png"), false);
  const scan = await scanUpload({
    bytes: new TextEncoder().encode("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"),
    filename: "eicar.txt",
    contentType: "text/plain"
  }, { STUDACAD_ENV: "test" });
  assert.equal(scan.clean, false);
  await assert.rejects(
    scanUpload({ bytes: new Uint8Array([1, 2, 3]), filename: "identity.pdf", contentType: "application/pdf" }, {
      STUDACAD_ENV: "production", STUDACAD_MALWARE_SCAN_URL: "http://scanner.example.test", STUDACAD_MALWARE_SCAN_TOKEN: "secret"
    }),
    /not configured securely/
  );
});
