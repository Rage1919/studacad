import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { bookingErrorResponse, cancelBooking } from "../../../../../server/bookings/repository";
import { appendCorrelatedAudit } from "../../../../../server/security/request-audit";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const { bookingId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(bookingId)) return Response.json({ error: "Booking not found." }, { status: 404 });
    const body = await request.json().catch(() => null) as { reason?: unknown; idempotencyKey?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    if (reason.length < 4 || reason.length > 500) return Response.json({ error: "Cancellation reason must be 4–500 characters." }, { status: 400 });
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) return Response.json({ error: "A valid idempotency key is required." }, { status: 400 });
    const cancellation = await cancelBooking({ actorUserId: viewer.id, bookingId, reason, idempotencyKey });
    await appendCorrelatedAudit({ request, actorUserId: viewer.id, action: "booking.cancel_request", entityType: "booking", entityId: bookingId });
    return Response.json({ cancellation }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return bookingErrorResponse(error); }
  }
}
