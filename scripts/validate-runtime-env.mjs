import nextEnvironment from "@next/env";
import { readRuntimeEnvironment } from "../server/runtime-env.mjs";

const { loadEnvConfig } = nextEnvironment;

try {
  loadEnvConfig(process.cwd());
  const environment = readRuntimeEnvironment(process.env);
  process.stdout.write(`Studacad ${environment.name} environment is valid (${environment.appUrl}).\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
