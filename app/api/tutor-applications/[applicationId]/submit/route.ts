import type { TutorApplicationStatus } from "../../../../../server/db/models";
import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { onboardingErrorResponse, transitionTutorApplication } from "../../../../../server/tutor-onboarding/repository";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const { applicationId } = await context.params;
    const body = await request.json().catch(() => ({})) as { targetStatus?: unknown };
    const targetStatus: TutorApplicationStatus = body.targetStatus === "withdrawn" ? "withdrawn" : "submitted";
    const status = await transitionTutorApplication({ actorUserId: viewer.id, applicationId, targetStatus });
    return Response.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
