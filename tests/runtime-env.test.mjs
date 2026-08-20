import assert from "node:assert/strict";
import test from "node:test";
import { RuntimeEnvironmentError, readRuntimeEnvironment } from "../server/runtime-env.mjs";

test("accepts a complete production environment and returns only public metadata", () => {
  const result = readRuntimeEnvironment({
    STUDACAD_ENV: "production",
    STUDACAD_APP_URL: "https://studacad.example/",
    STUDACAD_RELEASE_SHA: "9d890e94b4697ca9",
    STUDACAD_DEPLOYED_AT: "2026-08-19T18:00:00Z",
    DATABASE_URL: "must-not-leak"
  });

  assert.deepEqual(result, {
    name: "production",
    appUrl: "https://studacad.example",
    releaseSha: "9d890e94b4697ca9",
    deployedAt: "2026-08-19T18:00:00Z"
  });
  assert.equal("DATABASE_URL" in result, false);
});

test("rejects missing required values", () => {
  assert.throws(
    () => readRuntimeEnvironment({}),
    (error) => error instanceof RuntimeEnvironmentError
      && error.problems.includes("STUDACAD_ENV is required.")
      && error.problems.includes("STUDACAD_APP_URL is required.")
  );
});

test("requires HTTPS outside local and test environments", () => {
  assert.throws(
    () => readRuntimeEnvironment({ STUDACAD_ENV: "production", STUDACAD_APP_URL: "http://studacad.example" }),
    /must use HTTPS in production/
  );
});

test("rejects credentials, query strings, and malformed release metadata", () => {
  assert.throws(
    () => readRuntimeEnvironment({
      STUDACAD_ENV: "staging",
      STUDACAD_APP_URL: "https://user:pass@studacad.example/?token=secret",
      STUDACAD_RELEASE_SHA: "not-a-sha",
      STUDACAD_DEPLOYED_AT: "tomorrow"
    }),
    (error) => error instanceof RuntimeEnvironmentError && error.problems.length === 4
  );
});
