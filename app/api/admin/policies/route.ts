import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import {
  getPolicyReviewRegister,
  recordPolicyReview,
  supportErrorResponse,
} from "../../../../server/support/repository";
export async function GET() {
  try {
    await requireViewer(["admin"]);
    return Response.json(await getPolicyReviewRegister(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const input = {
      version: String(body?.version ?? ""),
      kind: String(body?.kind ?? ""),
      reviewer: String(body?.reviewer ?? "").trim(),
      outcome: String(body?.outcome ?? ""),
      evidence: String(body?.evidence ?? "").trim(),
      nextReview: String(body?.nextReview ?? ""),
    };
    if (
      !/^20\d\d-\d\d-\d\d$/.test(input.version) ||
      input.reviewer.length < 2 ||
      input.evidence.length < 4 ||
      Number.isNaN(Date.parse(input.nextReview))
    )
      return Response.json(
        { error: "Complete the policy review record." },
        { status: 400 },
      );
    return Response.json(
      { reviewId: await recordPolicyReview(viewer, input) },
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
