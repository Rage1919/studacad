export type Normalized<T> = { value: T; errors: string[] };
export function normalizeCoursePurchase(input: unknown): Normalized<{ courseSlug: string; idempotencyKey: string }>;
export function normalizeQuizAttempt(input: unknown): Normalized<{ lessonId: string; answers: Array<{ questionId: string; optionId: string }>; idempotencyKey: string }>;
export function normalizeReferralCode(value: unknown): { code: string; valid: boolean };
export function normalizeFavourite(input: unknown): { tutorProfileId: string; valid: boolean };
export function normalizeContentCommand(input: unknown): { action: string; payload: Record<string, unknown>; errors: string[] };
