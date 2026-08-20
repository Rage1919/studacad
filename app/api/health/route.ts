import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { databaseIsRequired, readDatabaseEnvironment } from "../../../server/database-env.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const environment = readRuntimeEnvironment(process.env);
  const database = databaseIsRequired(process.env)
    ? readDatabaseEnvironment(process.env)
    : null;

  return Response.json(
    {
      status: "ok",
      service: "studacad",
      environment: environment.name,
      release: environment.releaseSha,
      deployedAt: environment.deployedAt,
      dependencies: {
        database: database ? "configured" : "not-required"
      }
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
