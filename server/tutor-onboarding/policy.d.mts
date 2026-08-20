export const APPLICATION_STATUSES: readonly string[];
export const EXAM_LEVELS: readonly string[];
export const SESSION_FORMATS: readonly string[];
export const DOCUMENT_TYPES: readonly string[];
export function canTransitionApplication(from: string, to: string, actor: "applicant" | "reviewer"): boolean;
export function applicationIsEditable(status: string): boolean;
export function normalizeBotswanaPhone(value: unknown): string;
export function normalizeApplicationPayload(input: unknown): Record<string, unknown> & {
  legalName: string; phoneE164: string; district: string; town: string; headline: string; biography: string;
  teachingExperience: string; qualification: string; institution: string; languages: string[]; levels: string[];
  subjects: string[]; formats: string[]; basePriceCredits: number; sessionDurationMinutes: number; days: string[];
  startTime: string; endTime: string; consent: boolean;
};
export function validateApplicationPayload(payload: ReturnType<typeof normalizeApplicationPayload>, options?: { submission?: boolean }): string[];
export function uploadPolicy(documentType: string): { kind: "profile_image" | "tutor_qualification" | "tutor_identity"; maximumBytes: number; contentTypes: string[] } | null;
export function contentMatchesSignature(bytes: Uint8Array, contentType: string): boolean;
export function validateUploadMetadata(documentType: string, file: { type?: string; size?: number } | null): string[];
