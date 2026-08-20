import { messageWorkerAuthorized } from "../../../../../server/messages/internal-auth.mjs";
import {
  deliverQueuedMessages,
  messagingErrorResponse,
} from "../../../../../server/messages/repository";
import { requestId } from "../../../../../server/security/http-policy.mjs";
import { logOperationalEvent } from "../../../../../server/operations/structured-log.mjs";

export async function POST(request: Request) {
  if (
    !messageWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.MESSAGE_DELIVERY_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  const correlationId = requestId(request.headers.get("x-request-id"));
  const startedAt = Date.now();
  try {
    const result = await deliverQueuedMessages(20);
    logOperationalEvent({
      event: "job.messages.completed",
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
      event: "job.messages.failed",
      requestId: correlationId,
      details: {
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
    return messagingErrorResponse(error);
  }
}
