import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import {
  assertSameOrigin,
  CsrfError,
} from "../../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../../server/auth/viewer";
import { normalizeTutorReport } from "../../../../../server/support/policy.mjs";
import {
  reportTutor,
  supportErrorResponse,
} from "../../../../../server/support/repository";
export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const normalized = normalizeTutorReport(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    const { slug } = await context.params;
    return Response.json(
      { caseNumber: await reportTutor(viewer, slug, normalized.value) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
