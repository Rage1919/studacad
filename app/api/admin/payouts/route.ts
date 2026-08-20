import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import {
  normalizeAdminPayoutAction,
  normalizeBookingRefund,
  normalizeDestination,
} from "../../../../server/earnings/policy.mjs";
import {
  earningsErrorResponse,
  getAdminPayouts,
  refundBooking,
  transitionTutorPayout,
  verifyPayoutDestination,
} from "../../../../server/earnings/repository";

export async function GET() {
  try {
    await requireViewer(["admin"]);
    return Response.json(await getAdminPayouts(), {
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
    const viewer = await requireViewer(["admin"]);
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (body?.action === "verifyDestination") {
      const normalized = normalizeDestination(body);
      if (normalized.errors.length)
        return Response.json({ error: normalized.errors[0] }, { status: 400 });
      return Response.json(
        {
          destinationId: await verifyPayoutDestination(
            viewer,
            normalized.value,
          ),
        },
        { status: 201 },
      );
    }
    if (body?.action === "refund") {
      const normalized = normalizeBookingRefund(body);
      if (normalized.errors.length)
        return Response.json({ error: normalized.errors[0] }, { status: 400 });
      return Response.json(
        { refundId: await refundBooking(viewer, normalized.value) },
        { status: 201 },
      );
    }
    return Response.json(
      { error: "Unsupported payout operation." },
      { status: 400 },
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
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["admin"]);
    const normalized = normalizeAdminPayoutAction(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json({
      status: await transitionTutorPayout(viewer, normalized.value),
    });
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
