import assert from "node:assert/strict";
import test from "node:test";
import { accountAllowsSession, EMAIL_LINK_RESPONSE, hasRequiredRole, normalizeEmail, safeReturnPath, verifiedAuthIdentity } from "../server/auth/auth-policy.mjs";
import { authCookieOptions } from "../server/auth/cookie-options.mjs";
import { assertSameOrigin, CsrfError } from "../server/auth/csrf.mjs";

test("normalizes valid email without exposing account existence", () => {
  assert.equal(normalizeEmail(" Learner@Example.COM "), "learner@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.match(EMAIL_LINK_RESPONSE.message, /If that email can be used/);
});

test("return paths cannot escape the Studacad origin", () => {
  assert.equal(safeReturnPath("/wallet?tab=history"), "/wallet?tab=history");
  assert.equal(safeReturnPath("https://attacker.example"), "/account");
  assert.equal(safeReturnPath("//attacker.example"), "/account");
  assert.equal(safeReturnPath("/\\attacker.example"), "/account");
});

test("roles come from the server-side role set and cannot be escalated", () => {
  assert.equal(hasRequiredRole(["learner"], ["admin"]), false);
  assert.equal(hasRequiredRole(["learner", "tutor"], ["tutor", "admin"]), true);
  assert.equal(hasRequiredRole(["admin"], ["admin"]), true);
});

test("invalid, expired, unverified, suspended, and deleted sessions fail closed", () => {
  const verified = { email: "learner@example.com", email_confirmed_at: "2026-08-19T18:00:00Z" };
  assert.equal(verifiedAuthIdentity(verified), true);
  assert.equal(verifiedAuthIdentity(verified, new Error("expired token")), false);
  assert.equal(verifiedAuthIdentity({ email: "learner@example.com", email_confirmed_at: null }), false);
  assert.equal(accountAllowsSession({ status: "active", deleted_at: null }), true);
  assert.equal(accountAllowsSession({ status: "suspended", deleted_at: null }), false);
  assert.equal(accountAllowsSession({ status: "active", deleted_at: "2026-08-19T18:00:00Z" }), false);
});

test("session cookies are HttpOnly, SameSite, path-scoped, and secure outside local/test", () => {
  assert.deepEqual(authCookieOptions("production"), { httpOnly: true, path: "/", sameSite: "lax", secure: true });
  assert.equal(authCookieOptions("development").secure, false);
});

test("unsafe requests require an exact same-origin Origin header", () => {
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://studacad.com/api/account", {
    method: "POST",
    headers: { Origin: "https://studacad.com", "Sec-Fetch-Site": "same-origin" }
  }), "https://studacad.com"));

  assert.throws(() => assertSameOrigin(new Request("https://studacad.com/api/account", {
    method: "POST",
    headers: { Origin: "https://attacker.example", "Sec-Fetch-Site": "cross-site" }
  }), "https://studacad.com"), CsrfError);

  assert.throws(() => assertSameOrigin(new Request("https://studacad.com/api/account", { method: "POST" }), "https://studacad.com"), CsrfError);
});
