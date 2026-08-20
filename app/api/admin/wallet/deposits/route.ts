import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { findActiveUserByEmail } from "../../../../../server/db/repositories/user-accounts";
import { creditsForBwp, normalizeVerifiedDeposit } from "../../../../../server/wallet/policy.mjs";
import { recordVerifiedDeposit } from "../../../../../server/wallet/repository";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const normalized = normalizeVerifiedDeposit(await request.json().catch(() => null));
    if (normalized.errors.length) return Response.json({ error: normalized.errors[0] }, { status: 400 });

    const learner = await findActiveUserByEmail(normalized.value.learnerEmail);
    if (!learner) return Response.json({ error: "No active learner account uses that email address." }, { status: 404 });
    const transactionId = await recordVerifiedDeposit({
      actorUserId: viewer.id,
      learnerUserId: learner.id,
      amountBwp: normalized.value.amountBwp,
      depositReference: normalized.value.depositReference,
      idempotencyKey: normalized.value.idempotencyKey
    });
    return Response.json({
      transactionId,
      learner: { email: learner.email, displayName: learner.display_name },
      amountBwp: normalized.value.amountBwp,
      credits: creditsForBwp(normalized.value.amountBwp)
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch {
      return Response.json({ error: error instanceof Error ? error.message : "Unable to record the deposit." }, { status: 500 });
    }
  }
}
