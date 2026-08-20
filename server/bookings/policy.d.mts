import type { ExamLevel, Json, SessionFormat } from "../db/models";
export const SESSION_FORMATS: SessionFormat[];
export const EXAM_LEVELS: ExamLevel[];
export function normalizeSessionFormat(value: unknown): SessionFormat | null;
export function validTimezone(value: unknown): boolean;
export function normalizeSlotQuery(input: unknown): { value: { format: SessionFormat | null; examination: ExamLevel | null; subject: string; from: Date; to: Date }; errors: string[] };
export function normalizeBookingRequest(input: unknown): { value: { tutorSlug: string; format: SessionFormat | null; examination: ExamLevel | null; subject: string; startsAt: Date; timezone: string; learnerLocation: string; idempotencyKey: string }; errors: string[] };
export function normalizeAvailabilityUpdate(input: unknown): { value: { rules: Json[]; exceptions: Json[]; settings: Json }; errors: string[] };
