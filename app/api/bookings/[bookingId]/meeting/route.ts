import {
  authErrorResponse,
  requireViewer,
} from "../../../../../server/auth/viewer";
import {
  meetingErrorResponse,
  meetingForViewer,
} from "../../../../../server/meet/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { bookingId } = await context.params;
    return Response.json(
      { meeting: await meetingForViewer(viewer, bookingId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return meetingErrorResponse(error);
    }
  }
}
