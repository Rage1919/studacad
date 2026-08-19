import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import nextEnvironment from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnvironment;
loadEnvConfig(process.cwd());

const environmentName = process.env.STUDACAD_ENV?.trim();
if (!new Set(["development", "test"]).has(environmentName)) {
  throw new Error("Development seed data may run only with STUDACAD_ENV=development or test.");
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed development data.");

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  application_name: "studacad-development-seed"
});

try {
  const seed = await readFile(resolve("supabase", "seeds", "development.sql"), "utf8");
  await sql.begin(transaction => transaction.unsafe(seed));
  process.stdout.write("Development seed applied.\n");
} finally {
  await sql.end();
}
