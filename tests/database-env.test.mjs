import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseEnvironmentError, databaseIsRequired, readDatabaseEnvironment } from "../server/database-env.mjs";

const complete = {
  STUDACAD_ENV: "production",
  SUPABASE_URL: "https://project.supabase.co/",
  SUPABASE_PUBLISHABLE_KEY: "publishable-key-000000000000",
  SUPABASE_SECRET_KEY: "secret-key-000000000000000000",
  SUPABASE_PRIVATE_BUCKET: "studacad-private"
};

test("accepts a complete database environment", () => {
  assert.deepEqual(readDatabaseEnvironment(complete), {
    supabaseUrl: "https://project.supabase.co",
    publishableKey: complete.SUPABASE_PUBLISHABLE_KEY,
    secretKey: complete.SUPABASE_SECRET_KEY,
    privateBucket: "studacad-private"
  });
});

test("database configuration is mandatory in deployed environments", () => {
  assert.equal(databaseIsRequired({ STUDACAD_ENV: "development" }), false);
  assert.equal(databaseIsRequired({ STUDACAD_ENV: "test" }), false);
  assert.equal(databaseIsRequired({ STUDACAD_ENV: "staging" }), true);
  assert.equal(databaseIsRequired({ STUDACAD_ENV: "production" }), true);
});

test("rejects missing secrets and a public bucket", () => {
  assert.throws(
    () => readDatabaseEnvironment({ SUPABASE_URL: "https://project.supabase.co", SUPABASE_PRIVATE_BUCKET: "public" }),
    (error) => error instanceof DatabaseEnvironmentError
      && error.problems.includes("SUPABASE_PUBLISHABLE_KEY is required and appears invalid.")
      && error.problems.includes("SUPABASE_SECRET_KEY is required and appears invalid.")
      && error.problems.includes("SUPABASE_PRIVATE_BUCKET must be studacad-private.")
  );
});
