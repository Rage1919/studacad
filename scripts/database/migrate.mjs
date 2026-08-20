import nextEnvironment from "@next/env";
import postgres from "postgres";
import { readMigrationFiles } from "./migration-files.mjs";

const { loadEnvConfig } = nextEnvironment;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  application_name: "studacad-migrations"
});

try {
  await sql`select pg_advisory_lock(hashtext('studacad-schema-migrations'))`;
  await sql.unsafe(`
    create schema if not exists studacad_private;
    create table if not exists studacad_private.schema_migrations (
      name text primary key,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now()
    );
  `);

  const migrations = await readMigrationFiles();
  const appliedRows = await sql`select name, checksum_sha256 from studacad_private.schema_migrations`;
  const applied = new Map(appliedRows.map(row => [row.name, row.checksum_sha256]));

  for (const migration of migrations) {
    const previousChecksum = applied.get(migration.name);
    if (previousChecksum && previousChecksum !== migration.checksum) {
      throw new Error(`Applied migration ${migration.name} has changed.`);
    }
    if (previousChecksum) continue;

    await sql.begin(async transaction => {
      await transaction.unsafe(migration.sql);
      await transaction`
        insert into studacad_private.schema_migrations (name, checksum_sha256)
        values (${migration.name}, ${migration.checksum})
      `;
    });
    process.stdout.write(`Applied ${migration.name}\n`);
  }
} finally {
  await sql`select pg_advisory_unlock(hashtext('studacad-schema-migrations'))`.catch(() => undefined);
  await sql.end();
}
