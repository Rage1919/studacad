import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bodyLimitFor,
  consumeRateLimit,
  contentSecurityPolicy,
  parseContentLength,
  ratePolicyFor,
  redactLogValue,
  requestId,
  securityHeaders,
} from "../server/security/http-policy.mjs";
import { verifyHmacSha256 } from "../server/security/webhook-policy.mjs";

test("security headers constrain executable, framed, and browser capabilities", () => {
  const csp = contentSecurityPolicy({
    nonce: "unique-nonce",
    environmentName: "production",
  });
  assert.match(csp, /script-src 'self' 'nonce-unique-nonce' 'strict-dynamic'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /upgrade-insecure-requests/);
  const headers = securityHeaders({
    nonce: "n",
    environmentName: "production",
  });
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Strict-Transport-Security"], /includeSubDomains/);
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("request IDs, body limits, and rate limits fail safely", () => {
  assert.equal(requestId("request:valid-123"), "request:valid-123");
  assert.match(requestId("bad"), /^[0-9a-f-]{36}$/);
  assert.equal(parseContentLength("12"), 12);
  assert.equal(parseContentLength("-1"), -1);
  assert.equal(bodyLimitFor("/api/auth/email"), 128 * 1024);
  assert.equal(
    bodyLimitFor(
      "/api/tutor-applications/abc/documents",
      "multipart/form-data; boundary=x",
    ),
    12 * 1024 * 1024,
  );
  const policy = ratePolicyFor("POST", "/api/auth/email");
  const key = `security-test:${crypto.randomUUID()}`;
  for (let attempt = 0; attempt < policy.limit; attempt += 1)
    assert.equal(consumeRateLimit(key, policy, 1000).allowed, true);
  const limited = consumeRateLimit(key, policy, 1000);
  assert.equal(limited.allowed, false);
  assert.ok(limited.retryAfterSeconds > 0);
  assert.equal(
    consumeRateLimit(key, policy, 1000 + policy.windowMs).allowed,
    true,
  );
});

test("structured log redaction removes secrets and direct personal data", () => {
  assert.deepEqual(
    redactLogValue({
      event: "booking.created",
      email: "learner@example.test",
      nested: { authorization: "Bearer secret", bookingId: "safe-id" },
      body: "private message",
    }),
    {
      event: "booking.created",
      email: "[REDACTED]",
      nested: { authorization: "[REDACTED]", bookingId: "safe-id" },
      body: "[REDACTED]",
    },
  );
});

test("deployed webhooks require a valid constant-time HMAC", async () => {
  const payload = '{"event":"test"}';
  const secret = "test-webhook-secret";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const signature = `sha256=${[...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  assert.equal(
    await verifyHmacSha256({
      payload,
      signature,
      secret,
      environmentName: "production",
    }),
    true,
  );
  assert.equal(
    await verifyHmacSha256({
      payload: `${payload}x`,
      signature,
      secret,
      environmentName: "production",
    }),
    false,
  );
  assert.equal(
    await verifyHmacSha256({
      payload,
      signature: null,
      secret: undefined,
      environmentName: "production",
    }),
    false,
  );
  assert.equal(
    await verifyHmacSha256({
      payload,
      signature: null,
      secret: undefined,
      environmentName: "test",
    }),
    true,
  );
});

async function routeFiles(directory) {
  const output = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) output.push(...(await routeFiles(path)));
    else if (item.name === "route.ts") output.push(path);
  }
  return output;
}

test("every user-triggered API mutation retains same-origin CSRF enforcement", async () => {
  const routes = await routeFiles(
    fileURLToPath(new URL("../app/api", import.meta.url)),
  );
  const exceptions = new Set([
    join("app", "api", "whatsapp", "route.ts"),
    join("app", "api", "internal", "meet", "provision", "route.ts"),
    join("app", "api", "internal", "messages", "deliver", "route.ts"),
  ]);
  for (const path of routes) {
    const source = await readFile(path, "utf8");
    const relative = path.slice(path.indexOf(`${join("app", "api")}`));
    if (
      !/export async function (POST|PUT|PATCH|DELETE)/.test(source) ||
      exceptions.has(relative)
    )
      continue;
    assert.match(
      source,
      /assertSameOrigin/,
      `${relative} must enforce same-origin mutation requests`,
    );
  }
});
