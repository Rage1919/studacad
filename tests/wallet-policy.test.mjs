import assert from "node:assert/strict";
import test from "node:test";
import { creditsForBwp, normalizeVerifiedDeposit } from "../server/wallet/policy.mjs";

test("credit pricing is exactly one credit per whole BWP", () => {
  assert.equal(creditsForBwp(1), 1);
  assert.equal(creditsForBwp(250), 250);
  assert.throws(() => creditsForBwp(1.5), /whole number/);
  assert.throws(() => creditsForBwp(0), /whole number/);
});

test("verified deposits require stable reconciliation fields", () => {
  const valid = normalizeVerifiedDeposit({
    amountBwp: 600,
    learnerEmail: " LEARNER@EXAMPLE.TEST ",
    depositReference: " BANK-2026-001 ",
    idempotencyKey: " wallet-deposit-001 "
  });
  assert.deepEqual(valid.errors, []);
  assert.deepEqual(valid.value, {
    amountBwp: 600,
    learnerEmail: "learner@example.test",
    depositReference: "BANK-2026-001",
    idempotencyKey: "wallet-deposit-001"
  });
  const invalid = normalizeVerifiedDeposit({ amountBwp: 600.5, learnerEmail: "not-email", depositReference: "x", idempotencyKey: "short" });
  assert.equal(invalid.errors.length, 4);
});
