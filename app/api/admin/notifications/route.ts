import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import {
  getNotificationFailures,
  notificationErrorResponse,
} from "../../../../server/notifications/repository";
export async function GET() {
  try {
    await requireViewer(["admin"]);
    return Response.json(await getNotificationFailures(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return notificationErrorResponse(error);
    }
  }
}
