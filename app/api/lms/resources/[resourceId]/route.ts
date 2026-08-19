import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { createAuthorizedLearningResourceDownload } from "../../../../../server/storage/authorized-files";

export async function GET(_request: Request, context: RouteContext<"/api/lms/resources/[resourceId]">) {
  try {
    const viewer = await requireViewer(["learner"]);
    const { resourceId } = await context.params;
    return Response.redirect(await createAuthorizedLearningResourceDownload({ resourceId, learnerUserId: viewer.id }), 303);
  } catch (error) {
    try { return authErrorResponse(error); } catch {
      const message = error instanceof Error && /not found/i.test(error.message) ? "Learning resource not found." : "Learning resource access denied.";
      return Response.json({ error: message }, { status: message.endsWith("not found.") ? 404 : 403, headers: { "Cache-Control": "private, no-store" } });
    }
  }
}
