import nextEnvironment from "@next/env";
import { readDatabaseEnvironment } from "../server/database-env.mjs";

const { loadEnvConfig } = nextEnvironment;

try {
  loadEnvConfig(process.cwd());
  const environment = readDatabaseEnvironment(process.env);
  process.stdout.write(`Studacad database environment is valid (${environment.supabaseUrl}).\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
