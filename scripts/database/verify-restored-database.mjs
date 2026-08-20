import assert from "node:assert/strict";
import nextEnvironment from "@next/env";
import postgres from "postgres";
import { readMigrationFiles } from "./migration-files.mjs";

nextEnvironment.loadEnvConfig(process.cwd());
assert.ok(
  ["test", "staging"].includes(process.env.STUDACAD_ENV),
  "Restore verification is restricted to test or staging.",
);
assert.equal(
  process.env.STUDACAD_RESTORE_DRILL_ACK,
  "restored-non-production",
  "Set STUDACAD_RESTORE_DRILL_ACK=restored-non-production.",
);
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required.");

const startedAt = Date.now();
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  application_name: "studacad-restore-verification",
});

try {
  const expectedMigrations = await readMigrationFiles();
  const applied =
    await sql`select name, checksum_sha256 from studacad_private.schema_migrations order by name`;
  assert.equal(
    applied.length,
    expectedMigrations.length,
    "Restored migration count differs from this release.",
  );
  for (const [index, migration] of expectedMigrations.entries()) {
    assert.equal(applied[index].name, migration.name);
    assert.equal(applied[index].checksum_sha256, migration.checksum);
  }
  const rowSecurity = await sql`
    select count(*)::integer as count from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and pg_class.relkind = 'r' and pg_class.relrowsecurity = false
  `;
  assert.equal(
    rowSecurity[0].count,
    0,
    "A restored public table is missing row-level security.",
  );
  const snapshotRows =
    await sql`select public.operational_readiness_snapshot() as snapshot`;
  const snapshot = snapshotRows[0].snapshot;
  assert.equal(
    snapshot.ledgerUnbalancedTransactions,
    0,
    "Restored ledger contains an unbalanced transaction.",
  );
  assert.equal(
    snapshot.payoutClearingBalanced,
    true,
    "Restored payout clearing does not reconcile.",
  );
  process.stdout.write(
    `${JSON.stringify({ verifiedAt: new Date().toISOString(), durationMilliseconds: Date.now() - startedAt, migrations: applied.length, rowLevelSecurity: "passed", ledgerBalance: "passed", payoutClearing: "passed" }, null, 2)}\n`,
  );
} finally {
  await sql.end();
}
