export type RatePolicy = { scope: string; limit: number; windowMs: number };
export function requestId(incoming?: string | null): string;
export function bodyLimitFor(pathname: string, contentType?: string): number;
export function parseContentLength(value: string | null): number | null;
export function ratePolicyFor(method: string, pathname: string): RatePolicy;
export function consumeRateLimit(
  key: string,
  policy: RatePolicy,
  now?: number,
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};
export function contentSecurityPolicy(input: {
  nonce: string;
  environmentName: string;
}): string;
export function securityHeaders(input: {
  nonce: string;
  environmentName: string;
}): Record<string, string>;
export function redactLogValue(value: unknown, depth?: number): unknown;
export function clientAddress(headers: Headers): string;
