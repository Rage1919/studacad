import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { readMigrationFiles } from "../scripts/database/migration-files.mjs";
import { operationsHealthAuthorized } from "../server/operations/internal-auth.mjs";
import {
  createOperationalLogRecord,
  operationalRoute,
} from "../server/operations/structured-log.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (relative) => readFile(path.join(root, relative), "utf8");

test("operations authentication and structured logs fail closed without exposing identifiers", () => {
  const secret = ["operations", "health", "test", "credential"].join("-");
  assert.equal(operationsHealthAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(operationsHealthAuthorized("Bearer wrong", secret), false);
  assert.equal(operationsHealthAuthorized(null, undefined), false);
  assert.equal(
    operationalRoute(
      "/api/bookings/90000000-0000-4000-8000-000000000001/status",
    ),
    "/api/bookings/:id/status",
  );
  const record = createOperationalLogRecord({
    level: "error",
    event: "job.test.failed",
    requestId: "request:test-123",
    now: new Date("2026-08-20T00:00:00Z"),
    environment: "staging",
    release: "abcdef1",
    details: {
      email: "person@example.test",
      message: "private content",
      bookingId: "safe-correlated-id",
    },
  });
  assert.deepEqual(record.details, {
    email: "[REDACTED]",
    message: "[REDACTED]",
    bookingId: "safe-correlated-id",
  });
  assert.equal(record.requestId, "request:test-123");
});

test("operational database snapshot detects queue and financial health without user content", async () => {
  const db = new PGlite();
  try {
    for (const migration of await readMigrationFiles())
      await db.exec(migration.sql);
    const initial = (
      await db.query(
        "select public.operational_readiness_snapshot() as snapshot",
      )
    ).rows[0].snapshot;
    assert.equal(initial.database, "ok");
    assert.equal(initial.ledgerUnbalancedTransactions, 0);
    assert.equal(initial.payoutClearingBalanced, true);

    await db.exec(`
      insert into public.wallet_accounts(id,system_code)
      values ('10000000-0000-4000-8000-000000000201','readiness_test');
      insert into public.ledger_transactions(id,kind,idempotency_key,description)
      values ('20000000-0000-4000-8000-000000000201','adjustment','readiness-unbalanced','Readiness detection test');
      insert into public.ledger_entries(transaction_id,wallet_account_id,amount_credits)
      values ('20000000-0000-4000-8000-000000000201','10000000-0000-4000-8000-000000000201',1);
    `);
    const degraded = (
      await db.query(
        "select public.operational_readiness_snapshot() as snapshot",
      )
    ).rows[0].snapshot;
    assert.equal(degraded.ledgerUnbalancedTransactions, 1);
  } finally {
    await db.close();
  }
});

test("readiness evidence is complete, honest, and refuses to claim launch approval", async () => {
  const [status, packageJson, workflow, endpoint, capacity] = await Promise.all(
    [
      read("docs/release/readiness-status.json").then(JSON.parse),
      read("package.json"),
      read(".github/workflows/ci.yml"),
      read("app/api/internal/operations/route.ts"),
      read("config/release-capacity.json").then(JSON.parse),
    ],
  );
  assert.equal(status.decision, "NO_GO");
  assert.ok(
    status.launchRisks.filter((risk) => risk.severity === "launch-blocker")
      .length >= 1,
  );
  assert.equal(status.knownDefects.critical, 0);
  assert.equal(status.knownDefects.high, 0);
  assert.match(packageJson, /readiness:check/);
  assert.match(workflow, /pnpm readiness:check/);
  assert.match(endpoint, /OPERATIONS_HEALTH_SECRET/);
  assert.doesNotMatch(endpoint, /SUPABASE_SECRET_KEY|DATABASE_URL/);
  assert.equal(capacity.simultaneousBooking.expectedConfirmed, 1);
  assert.equal(capacity.webhookReplay.expectedDuplicateFinancialEffects, 0);
});

test("final release documentation covers every evidence-producing gate", async () => {
  const documents = await Promise.all(
    [
      "docs/release/staging-readiness-checklist.md",
      "docs/operations/observability-and-slos.md",
      "docs/runbooks/recovery-and-provider-drills.md",
      "docs/release/launch-capacity-and-load-plan.md",
      "docs/release/final-security-privacy-review.md",
      "docs/release/go-live-and-rollback-plan.md",
      "docs/release/roadmap-disposition.md",
    ].map(read),
  );
  const combined = documents.join("\n");
  for (const phrase of [
    "account deletion",
    "request ID",
    "dead letter",
    "payout clearing",
    "backup restore",
    "credential rotation",
    "simultaneous booking",
    "tenant isolation",
    "NO-GO",
  ])
    assert.match(combined.toLowerCase(), new RegExp(phrase.toLowerCase()));
});
