export const EARNINGS_POLICY: Readonly<{
  platformFeePercent: number;
  disputeHoldDays: number;
  minimumPayoutCredits: number;
  settlementMinorPerCredit: number;
  currency: string;
}>;
export function calculateTutorEconomics(grossCredits: number): {
  grossCredits: number;
  platformFeeCredits: number;
  netCredits: number;
};
export function normalizePayoutRequest(input: unknown): {
  errors: string[];
  value: { credits: number; destinationId: string; idempotencyKey: string };
};
export function normalizeAdminPayoutAction(input: unknown): {
  errors: string[];
  value: {
    payoutId: string;
    targetStatus: "reviewing" | "processing" | "paid" | "failed" | "cancelled";
    providerReference: string;
    reason: string;
  };
};
export function normalizeDestination(input: unknown): {
  errors: string[];
  value: {
    tutorUserId: string;
    provider: "manual_bank" | "manual_mobile_money";
    maskedReference: string;
    externalKycReference: string;
  };
};
export function normalizeBookingRefund(input: unknown): {
  errors: string[];
  value: {
    bookingId: string;
    learnerUserId: string;
    credits: number;
    reason: string;
    idempotencyKey: string;
  };
};
