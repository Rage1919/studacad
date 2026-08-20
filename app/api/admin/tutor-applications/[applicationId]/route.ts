import type { TutorApplicationStatus } from "../../../../../server/db/models";
import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { onboardingErrorResponse, transitionTutorApplication, TutorOnboardingError } from "../../../../../server/tutor-onboarding/repository";

const reviewerTargets = new Set<TutorApplicationStatus>(["under_review", "changes_requested", "approved", "rejected", "suspended"]);

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const { applicationId } = await context.params;
    const body = await request.json().catch(() => null) as { targetStatus?: unknown; internalNote?: unknown; applicantMessage?: unknown } | null;
    if (typeof body?.targetStatus !== "string" || !reviewerTargets.has(body.targetStatus as TutorApplicationStatus)) {
      throw new TutorOnboardingError("Choose a permitted review action.", 422);
    }
    const status = await transitionTutorApplication({
      actorUserId: viewer.id,
      applicationId,
      targetStatus: body.targetStatus as TutorApplicationStatus,
      internalNote: typeof body.internalNote === "string" ? body.internalNote.slice(0, 2000) : null,
      applicantMessage: typeof body.applicantMessage === "string" ? body.applicantMessage.slice(0, 2000) : null
    });
    return Response.json({ status }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
