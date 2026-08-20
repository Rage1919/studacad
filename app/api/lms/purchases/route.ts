import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import { normalizeCoursePurchase } from "../../../../server/learning/policy.mjs";
import {
  learningErrorResponse,
  purchaseCourse,
} from "../../../../server/learning/repository";
import { appendCorrelatedAudit } from "../../../../server/security/request-audit";
import {
  acceptPolicies,
  supportErrorResponse,
} from "../../../../server/support/repository";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["learner"]);
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const normalized = normalizeCoursePurchase(body);
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    if (body?.acceptPolicies !== true)
      return Response.json(
        { error: "Accept the Terms before purchasing this course." },
        { status: 400 },
      );
    await acceptPolicies(
      viewer,
      ["terms", "cancellation_refunds"],
      "course_purchase",
      normalized.value.idempotencyKey,
    );
    const purchase = (await purchaseCourse(
      viewer.id,
      normalized.value.courseSlug,
      normalized.value.idempotencyKey,
    )) as { purchaseId?: unknown };
    if (typeof purchase.purchaseId === "string")
      await appendCorrelatedAudit({
        request,
        actorUserId: viewer.id,
        action: "course.purchase_request",
        entityType: "course_purchase",
        entityId: purchase.purchaseId,
      });
    return Response.json(
      { purchase },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      try {
        return learningErrorResponse(error);
      } catch {
        return supportErrorResponse(error);
      }
    }
  }
}
