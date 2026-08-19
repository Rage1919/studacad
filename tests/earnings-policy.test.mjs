import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTutorEconomics,
  normalizeBookingRefund,
  normalizeDestination,
  normalizePayoutRequest,
} from "../server/earnings/policy.mjs";
import { earningsWorkerAuthorized } from "../server/earnings/internal-auth.mjs";

test("tutor fee math stays in whole credits and balances", () => {
  for (const gross of [0, 1, 2, 3, 7, 99, 100, 101, 999]) {
    const result = calculateTutorEconomics(gross);
    assert.equal(result.platformFeeCredits + result.netCredits, gross);
    assert.equal(result.platformFeeCredits, Math.round(gross * 0.2));
  }
});

test("payout, refund, destination, and worker inputs fail closed", () => {
  assert.ok(normalizePayoutRequest({ credits: 99 }).errors.length);
  assert.equal(
    normalizePayoutRequest({
      credits: 100,
      destinationId: "10000000-0000-4000-8000-000000000001",
      idempotencyKey: "payout-0001",
    }).errors.length,
    0,
  );
  assert.ok(
    normalizeDestination({
      tutorUserId: "10000000-0000-4000-8000-000000000001",
      provider: "manual_bank",
      maskedReference: "12345678",
      externalKycReference: "case-1",
    }).errors.length,
  );
  assert.equal(
    normalizeBookingRefund({
      bookingId: "10000000-0000-4000-8000-000000000001",
      learnerUserId: "10000000-0000-4000-8000-000000000002",
      credits: 1,
      reason: "Support resolution",
      idempotencyKey: "refund-0001",
    }).errors.length,
    0,
  );
  assert.equal(
    earningsWorkerAuthorized(
      "Bearer this-is-a-long-worker-secret",
      "this-is-a-long-worker-secret",
    ),
    true,
  );
  assert.equal(
    earningsWorkerAuthorized(
      "Bearer incorrect-long-worker-secret",
      "this-is-a-long-worker-secret",
    ),
    false,
  );
});
