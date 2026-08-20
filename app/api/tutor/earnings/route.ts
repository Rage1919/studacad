import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import { normalizePayoutRequest } from "../../../../server/earnings/policy.mjs";
import {
  earningsErrorResponse,
  getTutorEarnings,
  requestTutorPayout,
} from "../../../../server/earnings/repository";

export async function GET() {
  try {
    const viewer = await requireViewer(["tutor"]);
    return Response.json(await getTutorEarnings(viewer), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return earningsErrorResponse(error);
    }
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["tutor"]);
    const normalized = normalizePayoutRequest(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json(
      { payoutId: await requestTutorPayout(viewer, normalized.value) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return earningsErrorResponse(error);
    }
  }
}
