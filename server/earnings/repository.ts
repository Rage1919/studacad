import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { Viewer } from "../auth/viewer";

export class EarningsError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
    this.name = "EarningsError";
  }
}

const fail = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message ?? "";
  const safe = [
    "Minimum payout is 100 credits",
    "Insufficient available tutor earnings",
    "Verified payout destination required",
    "Unsupported payout transition",
    "Provider settlement reference required",
    "Failure or cancellation reason required",
    "Refund exceeds learner payment",
    "Payout not found",
  ].find((item) => message.includes(item));
  throw new EarningsError(safe ?? fallback, safe ? 409 : 500);
};

export async function getTutorEarnings(viewer: Viewer) {
  const db = getDatabaseAdminClient();
  const [earnings, payouts, destinations, available] = await Promise.all([
    db
      .from("tutor_earnings")
      .select("*")
      .eq("tutor_user_id", viewer.id)
      .order("created_at", { ascending: false }),
    db
      .from("tutor_payouts")
      .select("*")
      .eq("tutor_user_id", viewer.id)
      .order("requested_at", { ascending: false }),
    db
      .from("tutor_payout_destinations")
      .select("*")
      .eq("tutor_user_id", viewer.id)
      .eq("status", "verified")
      .order("created_at", { ascending: false }),
    db.rpc("tutor_payout_available_credits", { p_tutor_user_id: viewer.id }),
  ]);
  if (earnings.error || payouts.error || destinations.error || available.error)
    fail(
      earnings.error ?? payouts.error ?? destinations.error ?? available.error,
      "Unable to load tutor earnings.",
    );
  const earningRows = earnings.data ?? [];
  const payoutRows = payouts.data ?? [];
  const destinationRows = destinations.data ?? [];
  const pendingCredits = earningRows
    .filter((item) => item.status === "pending" || item.status === "held")
    .reduce(
      (sum, item) =>
        sum + Math.max(0, item.net_credits - item.refunded_credits),
      0,
    );
  const paidCredits = payoutRows
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.credits, 0);
  return {
    earnings: earningRows,
    payouts: payoutRows,
    destinations: destinationRows,
    balances: {
      pendingCredits,
      availableCredits: Number(available.data ?? 0),
      paidCredits,
    },
  };
}

export async function requestTutorPayout(
  viewer: Viewer,
  input: { destinationId: string; credits: number; idempotencyKey: string },
) {
  const result = await getDatabaseAdminClient().rpc("request_tutor_payout", {
    p_tutor: viewer.id,
    p_destination: input.destinationId,
    p_credits: input.credits,
    p_key: input.idempotencyKey,
  });
  if (result.error) fail(result.error, "Unable to request this payout.");
  return result.data;
}

export async function releaseTutorEarnings(limit = 100) {
  const result = await getDatabaseAdminClient().rpc(
    "release_available_tutor_earnings",
    { p_limit: limit },
  );
  if (result.error) fail(result.error, "Unable to release tutor earnings.");
  return result.data;
}

export async function getAdminPayouts() {
  const db = getDatabaseAdminClient();
  const [payouts, destinations, refunds, accounts, clearing] =
    await Promise.all([
      db
        .from("tutor_payouts")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(200),
      db
        .from("tutor_payout_destinations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("booking_refunds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("user_accounts")
        .select("*")
        .order("display_name", { ascending: true }),
      db
        .from("wallet_accounts")
        .select("*")
        .eq("system_code", "payout_clearing")
        .maybeSingle(),
    ]);
  if (
    payouts.error ||
    destinations.error ||
    refunds.error ||
    accounts.error ||
    clearing.error
  )
    fail(
      payouts.error ??
        destinations.error ??
        refunds.error ??
        accounts.error ??
        clearing.error,
      "Unable to load payout operations.",
    );
  let clearingCredits = 0;
  if (clearing.data) {
    const balance = await db
      .from("wallet_balances")
      .select("*")
      .eq("wallet_account_id", clearing.data.id)
      .maybeSingle();
    if (balance.error)
      fail(balance.error, "Unable to reconcile payout clearing.");
    clearingCredits = Number(balance.data?.balance_credits ?? 0);
  }
  const payoutRows = payouts.data ?? [];
  const expectedClearingCredits = payoutRows
    .filter((item) =>
      ["requested", "reviewing", "processing"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.credits, 0);
  return {
    payouts: payoutRows,
    destinations: destinations.data ?? [],
    refunds: refunds.data ?? [],
    tutors: accounts.data ?? [],
    reconciliation: {
      clearingCredits,
      expectedClearingCredits,
      balanced: clearingCredits === expectedClearingCredits,
    },
  };
}

export async function verifyPayoutDestination(
  viewer: Viewer,
  input: {
    tutorUserId: string;
    provider: string;
    maskedReference: string;
    externalKycReference: string;
  },
) {
  const result = await getDatabaseAdminClient().rpc(
    "verify_tutor_payout_destination",
    {
      p_actor: viewer.id,
      p_tutor: input.tutorUserId,
      p_provider: input.provider,
      p_masked: input.maskedReference,
      p_kyc_ref: input.externalKycReference,
    },
  );
  if (result.error)
    fail(result.error, "Unable to verify the payout destination.");
  return result.data;
}

export async function transitionTutorPayout(
  viewer: Viewer,
  input: {
    payoutId: string;
    targetStatus: "reviewing" | "processing" | "paid" | "failed" | "cancelled";
    providerReference: string;
    reason: string;
  },
) {
  const result = await getDatabaseAdminClient().rpc(
    "admin_transition_tutor_payout",
    {
      p_actor: viewer.id,
      p_payout: input.payoutId,
      p_target: input.targetStatus,
      p_provider_ref: input.providerReference || null,
      p_reason: input.reason || null,
    },
  );
  if (result.error) fail(result.error, "Unable to update this payout.");
  return result.data;
}

export async function refundBooking(
  viewer: Viewer,
  input: {
    bookingId: string;
    learnerUserId: string;
    credits: number;
    reason: string;
    idempotencyKey: string;
  },
) {
  const result = await getDatabaseAdminClient().rpc("admin_refund_booking", {
    p_actor: viewer.id,
    p_booking: input.bookingId,
    p_learner: input.learnerUserId,
    p_credits: input.credits,
    p_reason: input.reason,
    p_key: input.idempotencyKey,
  });
  if (result.error) fail(result.error, "Unable to record this booking refund.");
  return result.data;
}

export function earningsErrorResponse(error: unknown) {
  if (error instanceof EarningsError)
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  throw error;
}
