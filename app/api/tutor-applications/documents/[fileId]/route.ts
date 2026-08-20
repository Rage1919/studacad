import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { createTutorDocumentDownload, onboardingErrorResponse } from "../../../../../server/tutor-onboarding/repository";

export async function GET(_request: Request, context: { params: Promise<{ fileId: string }> }) {
  try {
    const viewer = await requireViewer();
    const { fileId } = await context.params;
    const url = await createTutorDocumentDownload(fileId, viewer);
    return Response.redirect(url, 303);
  } catch (error) {
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
