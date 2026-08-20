import { notificationWorkerAuthorized } from "../../../../../server/notifications/internal-auth.mjs";
import {
  deliverNotifications,
  notificationErrorResponse,
} from "../../../../../server/notifications/repository";
import { requestId } from "../../../../../server/security/http-policy.mjs";
import { logOperationalEvent } from "../../../../../server/operations/structured-log.mjs";
export async function POST(request: Request) {
  if (
    !notificationWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.NOTIFICATION_WORKER_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  const correlationId = requestId(request.headers.get("x-request-id"));
  const startedAt = Date.now();
  try {
    const result = await deliverNotifications(50);
    logOperationalEvent({
      event: "job.notifications.completed",
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
      event: "job.notifications.failed",
      requestId: correlationId,
      details: {
        durationMs: Date.now() - startedAt,
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
    return notificationErrorResponse(error);
  }
}
