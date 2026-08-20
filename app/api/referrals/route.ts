import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { normalizeReferralCode } from "../../../server/learning/policy.mjs";
import { attachReferralCode, getReferralStatus, learningErrorResponse } from "../../../server/learning/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json(await getReferralStatus(viewer.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["learner"]);
    const body = await request.json().catch(() => null) as { code?: unknown } | null;
    const normalized = normalizeReferralCode(body?.code);
    if (!normalized.valid) return Response.json({ error: "A valid referral code is required." }, { status: 400 });
    const attributionId = await attachReferralCode(viewer.id, normalized.code);
    return Response.json({ attributionId }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}
