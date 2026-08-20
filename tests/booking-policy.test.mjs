import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAvailabilityUpdate, normalizeBookingRequest, normalizeSessionFormat, normalizeSlotQuery } from "../server/bookings/policy.mjs";

test("booking inputs normalize UI formats and reject unsafe windows", () => {
  assert.equal(normalizeSessionFormat("online-1to1"), "online_1to1");
  assert.equal(normalizeSessionFormat("unknown"), null);
  const valid = normalizeBookingRequest({ tutorSlug: "masego-tutor", format: "online-1to1", examination: "PSLE", subject: "Mathematics", startsAt: "2026-09-01T08:00:00Z", timezone: "Africa/Gaborone", idempotencyKey: "booking-test-001" });
  assert.deepEqual(valid.errors, []);
  const tooLong = normalizeSlotQuery({ format: "online_1to1", examination: "PSLE", subject: "Mathematics", from: "2026-09-01T00:00:00Z", to: "2026-11-01T00:00:00Z" });
  assert.ok(tooLong.errors.some(error => /31 days/.test(error)));
});

test("availability updates validate prices, capacity, timezones, rules, and exceptions", () => {
  const valid = normalizeAvailabilityUpdate({
    rules: [{ weekday: 1, localStartTime: "16:00", localEndTime: "19:00", timezone: "Africa/Gaborone", format: "online-1to1", slotDurationMinutes: 50, leadTimeMinutes: 120, bufferBeforeMinutes: 0, bufferAfterMinutes: 10, effectiveFrom: "2026-08-19" }],
    exceptions: [{ startsAt: "2026-09-01T08:00:00Z", endsAt: "2026-09-01T10:00:00Z", available: false, reason: "School event" }],
    settings: { subjects: [{ examination: "PSLE", subject: "Mathematics", priceCredits: 80 }], formats: [{ format: "online-1to1", groupCapacity: 1, locationNote: "" }] }
  });
  assert.deepEqual(valid.errors, []);
  const invalid = normalizeAvailabilityUpdate({
    rules: [{ weekday: 9, localStartTime: "19:00", localEndTime: "16:00", timezone: "Mars/Base", format: "invalid", slotDurationMinutes: 5, leadTimeMinutes: -1, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, effectiveFrom: "bad" }],
    exceptions: [{ startsAt: "bad", endsAt: "bad" }], settings: { subjects: [], formats: [] }
  });
  assert.ok(invalid.errors.length >= 7);
});
