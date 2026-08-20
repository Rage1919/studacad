import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { requestId } from "../../../../server/security/http-policy.mjs";
import { operationsHealthAuthorized } from "../../../../server/operations/internal-auth.mjs";
import { logOperationalEvent } from "../../../../server/operations/structured-log.mjs";
import {
  getOperationalSnapshot,
  operationalSnapshotHealthy,
} from "../../../../server/operations/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (
    !operationsHealthAuthorized(
      request.headers.get("authorization"),
      process.env.OPERATIONS_HEALTH_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });

  const correlationId = requestId(request.headers.get("x-request-id"));
  const startedAt = Date.now();
  try {
    const environment = readRuntimeEnvironment(process.env);
    const snapshot = await getOperationalSnapshot();
    const healthy = operationalSnapshotHealthy(snapshot);
    logOperationalEvent({
      level: healthy ? "info" : "warn",
      event: "operations.snapshot",
      requestId: correlationId,
      details: { healthy, durationMs: Date.now() - startedAt },
    });
    return Response.json(
      {
        status: healthy ? "ok" : "degraded",
        service: "studacad",
        environment: environment.name,
        release: environment.releaseSha,
        snapshot,
      },
      {
        status: healthy ? 200 : 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Request-Id": correlationId,
        },
      },
    );
  } catch (error) {
    logOperationalEvent({
      level: "error",
      event: "operations.snapshot_failed",
      requestId: correlationId,
      details: {
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
    return Response.json(
      { status: "unavailable", service: "studacad" },
      {
        status: 503,
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          "X-Request-Id": correlationId,
        },
      },
    );
  }
}
