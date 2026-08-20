import { earningsWorkerAuthorized } from "../../../../../server/earnings/internal-auth.mjs";
import {
  earningsErrorResponse,
  releaseTutorEarnings,
} from "../../../../../server/earnings/repository";
import { requestId } from "../../../../../server/security/http-policy.mjs";
import { logOperationalEvent } from "../../../../../server/operations/structured-log.mjs";
export async function POST(request: Request) {
  if (
    !earningsWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.EARNINGS_WORKER_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  const correlationId = requestId(request.headers.get("x-request-id"));
  const startedAt = Date.now();
  try {
    const released = await releaseTutorEarnings(100);
    logOperationalEvent({
      event: "job.earnings.completed",
      requestId: correlationId,
      details: { released, durationMs: Date.now() - startedAt },
    });
    return Response.json(
      { released },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": correlationId,
        },
      },
    );
  } catch (error) {
    logOperationalEvent({
      level: "error",
      event: "job.earnings.failed",
      requestId: correlationId,
      details: {
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
    return earningsErrorResponse(error);
  }
}
