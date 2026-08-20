import type { AppRole } from "../db/models";

export function normalizeEmail(value: unknown): string | null;
export function safeReturnPath(value: unknown, fallback?: string): string;
export function hasRequiredRole(actualRoles: readonly AppRole[], requiredRoles: readonly AppRole[]): boolean;
export function verifiedAuthIdentity(authUser: { email?: unknown; email_confirmed_at?: unknown } | null | undefined, providerError?: unknown): boolean;
export function accountAllowsSession(account: { status?: unknown; deleted_at?: unknown } | null | undefined): boolean;
export const EMAIL_LINK_RESPONSE: Readonly<{ message: string }>;
