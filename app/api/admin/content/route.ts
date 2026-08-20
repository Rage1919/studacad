import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";
import { normalizeContentCommand } from "../../../../server/learning/policy.mjs";
import { executeContentCommand, getLearningSnapshot, learningErrorResponse } from "../../../../server/learning/repository";

export async function GET() {
  try {
    const viewer = await requireViewer(["admin"]);
    return Response.json(await getLearningSnapshot(viewer.id, true), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const normalized = normalizeContentCommand(await request.json().catch(() => null));
    if (normalized.errors.length) return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json(await executeContentCommand(viewer.id, normalized.action, normalized.payload), { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}
