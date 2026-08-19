import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { getLatestApplicantApplication, onboardingErrorResponse, saveApplicantApplication } from "../../../server/tutor-onboarding/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const application = await getLatestApplicantApplication(viewer.id);
    return Response.json({ application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const body = await request.json().catch(() => null) as { applicationId?: unknown; payload?: unknown } | null;
    const applicationId = typeof body?.applicationId === "string" && body.applicationId ? body.applicationId : null;
    const application = await saveApplicantApplication(viewer.id, applicationId, body?.payload);
    return Response.json({ application }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return onboardingErrorResponse(error); }
  }
}
