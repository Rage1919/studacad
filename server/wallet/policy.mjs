export const MIN_DEPOSIT_BWP = 1;
export const MAX_DEPOSIT_BWP = 1_000_000;

export function creditsForBwp(amountBwp) {
  if (!Number.isSafeInteger(amountBwp) || amountBwp < MIN_DEPOSIT_BWP || amountBwp > MAX_DEPOSIT_BWP) {
    throw new RangeError(`Deposit amount must be a whole number from ${MIN_DEPOSIT_BWP} to ${MAX_DEPOSIT_BWP} BWP.`);
  }
  return amountBwp;
}

export function normalizeVerifiedDeposit(input) {
  const amountBwp = typeof input?.amountBwp === "number" ? input.amountBwp : Number.NaN;
  const learnerEmail = typeof input?.learnerEmail === "string" ? input.learnerEmail.trim().toLowerCase() : "";
  const depositReference = typeof input?.depositReference === "string" ? input.depositReference.trim() : "";
  const idempotencyKey = typeof input?.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const errors = [];
  try { creditsForBwp(amountBwp); } catch (error) { errors.push(error.message); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(learnerEmail)) errors.push("Enter the learner's account email address.");
  if (depositReference.length < 4 || depositReference.length > 100) errors.push("Deposit reference must be 4–100 characters.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100) errors.push("Idempotency key must be 8–100 characters.");
  return { value: { amountBwp, learnerEmail, depositReference, idempotencyKey }, errors };
}
