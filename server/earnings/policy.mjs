export const EARNINGS_POLICY = Object.freeze({
  platformFeePercent: 20,
  disputeHoldDays: 7,
  minimumPayoutCredits: 100,
  settlementMinorPerCredit: 100,
  currency: "BWP",
});

export function calculateTutorEconomics(grossCredits) {
  if (!Number.isSafeInteger(grossCredits) || grossCredits < 0)
    throw new Error("Gross credits must be a non-negative whole number.");
  const platformFeeCredits = Math.round(
    (grossCredits * EARNINGS_POLICY.platformFeePercent) / 100,
  );
  return {
    grossCredits,
    platformFeeCredits,
    netCredits: grossCredits - platformFeeCredits,
  };
}

export function normalizePayoutRequest(input) {
  const credits = Number(input?.credits);
  const destinationId = String(input?.destinationId ?? "").trim();
  const idempotencyKey = String(input?.idempotencyKey ?? "").trim();
  const errors = [];
  if (
    !Number.isSafeInteger(credits) ||
    credits < EARNINGS_POLICY.minimumPayoutCredits
  )
    errors.push(
      `Payouts must be at least ${EARNINGS_POLICY.minimumPayoutCredits} whole credits.`,
    );
  if (!/^[0-9a-f-]{36}$/i.test(destinationId))
    errors.push("Select a verified payout destination.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100)
    errors.push("A stable payout request key is required.");
  return { errors, value: { credits, destinationId, idempotencyKey } };
}

export function normalizeAdminPayoutAction(input) {
  const action = String(input?.action ?? "");
  const payoutId = String(input?.payoutId ?? "").trim();
  const targetStatus = String(input?.targetStatus ?? "");
  const providerReference = String(input?.providerReference ?? "").trim();
  const reason = String(input?.reason ?? "").trim();
  const allowed = ["reviewing", "processing", "paid", "failed", "cancelled"];
  const errors = [];
  if (action !== "transition" || !/^[0-9a-f-]{36}$/i.test(payoutId))
    errors.push("A valid payout action is required.");
  if (!allowed.includes(targetStatus))
    errors.push("Unsupported payout status.");
  if (targetStatus === "paid" && providerReference.length < 4)
    errors.push("A settlement reference is required.");
  if (["failed", "cancelled"].includes(targetStatus) && reason.length < 4)
    errors.push("A reason is required.");
  return {
    errors,
    value: { payoutId, targetStatus, providerReference, reason },
  };
}

export function normalizeDestination(input) {
  const tutorUserId = String(input?.tutorUserId ?? "").trim();
  const provider = String(input?.provider ?? "");
  const maskedReference = String(input?.maskedReference ?? "").trim();
  const externalKycReference = String(input?.externalKycReference ?? "").trim();
  const errors = [];
  if (!/^[0-9a-f-]{36}$/i.test(tutorUserId))
    errors.push("A tutor account is required.");
  if (!["manual_bank", "manual_mobile_money"].includes(provider))
    errors.push("Unsupported payout method.");
  if (maskedReference.length < 4 || !/[•*xX]/.test(maskedReference))
    errors.push("Store only a masked destination reference.");
  if (externalKycReference.length < 4)
    errors.push("An external verification reference is required.");
  return {
    errors,
    value: { tutorUserId, provider, maskedReference, externalKycReference },
  };
}

export function normalizeBookingRefund(input) {
  const bookingId = String(input?.bookingId ?? "").trim();
  const learnerUserId = String(input?.learnerUserId ?? "").trim();
  const credits = Number(input?.credits);
  const reason = String(input?.reason ?? "").trim();
  const idempotencyKey = String(input?.idempotencyKey ?? "").trim();
  const errors = [];
  if (
    !/^[0-9a-f-]{36}$/i.test(bookingId) ||
    !/^[0-9a-f-]{36}$/i.test(learnerUserId)
  )
    errors.push("A booking participant is required.");
  if (!Number.isSafeInteger(credits) || credits < 1)
    errors.push("Refund credits must be a positive whole number.");
  if (reason.length < 5 || reason.length > 1000)
    errors.push("A refund reason is required.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 100)
    errors.push("A stable refund key is required.");
  return {
    errors,
    value: { bookingId, learnerUserId, credits, reason, idempotencyKey },
  };
}
