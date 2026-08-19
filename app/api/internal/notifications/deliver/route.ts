import { notificationWorkerAuthorized } from "../../../../../server/notifications/internal-auth.mjs";
import {
  deliverNotifications,
  notificationErrorResponse,
} from "../../../../../server/notifications/repository";
export async function POST(request: Request) {
  if (
    !notificationWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.NOTIFICATION_WORKER_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  try {
    return Response.json(
      { result: await deliverNotifications(50) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
