import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";
import { normalizeQuizAttempt } from "../../../../server/learning/policy.mjs";
import { learningErrorResponse, submitQuizAttempt } from "../../../../server/learning/repository";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["learner"]);
    const normalized = normalizeQuizAttempt(await request.json().catch(() => null));
    if (normalized.errors.length) return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json({ attempt: await submitQuizAttempt(viewer.id, normalized.value.lessonId, normalized.value.answers, normalized.value.idempotencyKey) }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}
