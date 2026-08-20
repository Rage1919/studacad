import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readDatabaseEnvironment } from "./server/database-env.mjs";
import type { Database } from "./server/db/database.types";
import { authCookieOptions } from "./server/auth/cookie-options.mjs";
import {
  bodyLimitFor,
  clientAddress,
  consumeRateLimit,
  parseContentLength,
  ratePolicyFor,
  requestId,
  securityHeaders,
} from "./server/security/http-policy.mjs";

const applyHeaders = (
  response: NextResponse,
  headers: Record<string, string>,
  correlationId: string,
) => {
  for (const [name, value] of Object.entries(headers))
    response.headers.set(name, value);
  response.headers.set("X-Request-Id", correlationId);
  return response;
};

export async function proxy(request: NextRequest) {
  const environmentName = process.env.STUDACAD_ENV?.trim() || "production";
  const correlationId = requestId(request.headers.get("x-request-id"));
  const nonce = btoa(crypto.randomUUID());
  const responseSecurityHeaders = securityHeaders({ nonce, environmentName });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", correlationId);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    "Content-Security-Policy",
    responseSecurityHeaders["Content-Security-Policy"],
  );
  const makeResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const contentLength = parseContentLength(
      request.headers.get("content-length"),
    );
    const bodyLimit = bodyLimitFor(
      request.nextUrl.pathname,
      request.headers.get("content-type") ?? "",
    );
    if (
      contentLength === -1 ||
      (contentLength !== null && contentLength > bodyLimit)
    ) {
      return applyHeaders(
        NextResponse.json(
          { error: "Request body is too large." },
          { status: 413 },
        ),
        responseSecurityHeaders,
        correlationId,
      );
    }
    const policy = ratePolicyFor(request.method, request.nextUrl.pathname);
    const rate = consumeRateLimit(
      `${clientAddress(request.headers)}:${policy.scope}`,
      policy,
    );
    if (!rate.allowed) {
      const limited = NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      );
      limited.headers.set("Retry-After", String(rate.retryAfterSeconds));
      limited.headers.set("X-RateLimit-Remaining", "0");
      return applyHeaders(limited, responseSecurityHeaders, correlationId);
    }
  }

  let response = makeResponse();
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") || name.startsWith("supabase-"));
  if (hasAuthCookie) {
    const environment = readDatabaseEnvironment(process.env);
    const cookieOptions = authCookieOptions(process.env.STUDACAD_ENV);
    const client = createServerClient<Database>(
      environment.supabaseUrl,
      environment.publishableKey,
      {
        auth: { flowType: "pkce" },
        cookieOptions,
        cookies: {
          encode: "tokens-only",
          getAll: () =>
            request.cookies
              .getAll()
              .map(({ name, value }) => ({ name, value })),
          setAll: (cookiesToSet, headers) => {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = makeResponse();
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set({
                ...options,
                name,
                value,
                ...cookieOptions,
              }),
            );
            for (const [name, value] of Object.entries(headers))
              response.headers.set(name, value);
          },
        },
      },
    );
    await client.auth.getUser();
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return applyHeaders(response, responseSecurityHeaders, correlationId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
