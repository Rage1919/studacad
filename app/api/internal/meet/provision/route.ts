import { provisionerAuthorized } from "../../../../../server/meet/internal-auth.mjs";
import {
  meetingErrorResponse,
  provisionPendingMeetings,
} from "../../../../../server/meet/repository";
import { requestId } from "../../../../../server/security/http-policy.mjs";
import { logOperationalEvent } from "../../../../../server/operations/structured-log.mjs";

export async function POST(request: Request) {
  if (
    !provisionerAuthorized(
      request.headers.get("authorization"),
      process.env.MEET_PROVISIONER_SECRET,
    )
  ) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  const correlationId = requestId(request.headers.get("x-request-id"));
  const startedAt = Date.now();
  try {
    const result = await provisionPendingMeetings(5);
    logOperationalEvent({
      event: "job.meet.completed",
      requestId: correlationId,
      details: { ...result, durationMs: Date.now() - startedAt },
    });
    return Response.json(
      { result },
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
      event: "job.meet.failed",
      requestId: correlationId,
      details: {
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
    return meetingErrorResponse(error);
  }
}
