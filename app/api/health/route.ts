import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const environment = readRuntimeEnvironment(process.env);

  return Response.json(
    {
      status: "ok",
      service: "studacad",
      environment: environment.name,
      release: environment.releaseSha,
      deployedAt: environment.deployedAt
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}
