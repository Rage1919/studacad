export const MIN_DEPOSIT_BWP: number;
export const MAX_DEPOSIT_BWP: number;
export function creditsForBwp(amountBwp: number): number;
export function normalizeVerifiedDeposit(input: unknown): {
  value: { amountBwp: number; learnerEmail: string; depositReference: string; idempotencyKey: string };
  errors: string[];
};
