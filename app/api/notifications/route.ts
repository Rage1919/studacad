import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import {
  getNotificationCenter,
  markNotificationRead,
  notificationErrorResponse,
  updateNotificationPreferences,
} from "../../../server/notifications/repository";
export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json(await getNotificationCenter(viewer), {
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
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (body?.action === "read" && typeof body.id === "string") {
      await markNotificationRead(viewer, body.id);
      return Response.json({ read: true });
    }
    if (
      body?.action === "preferences" &&
      typeof body.bookingReminderEmail === "boolean" &&
      typeof body.newMessageEmail === "boolean"
    )
      return Response.json(
        await updateNotificationPreferences(viewer, {
          bookingReminderEmail: body.bookingReminderEmail,
          newMessageEmail: body.newMessageEmail,
        }),
      );
    return Response.json(
      { error: "Invalid notification update." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return notificationErrorResponse(error);
    }
  }
}
