import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";
import { listTutorApplicationsForReview, onboardingErrorResponse } from "../../../../server/tutor-onboarding/repository";

export async function GET() {
  try {
    await requireViewer(["admin"]);
    const applications = await listTutorApplicationsForReview();
    return Response.json({ applications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
