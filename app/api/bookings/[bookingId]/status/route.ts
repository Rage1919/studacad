import { readRuntimeEnvironment } from "../../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../../server/auth/viewer";
import { bookingErrorResponse, recordBookingOutcome } from "../../../../../server/bookings/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const { bookingId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(bookingId)) return Response.json({ error: "Booking not found." }, { status: 404 });
    const body = await request.json().catch(() => null) as { status?: unknown; reason?: unknown; idempotencyKey?: unknown } | null;
    const status = typeof body?.status === "string" && ["completed", "no_show", "disputed"].includes(body.status) ? body.status as "completed" | "no_show" | "disputed" : null;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
    if (!status) return Response.json({ error: "Choose a valid booking outcome." }, { status: 400 });
    if (reason.length < 4 || reason.length > 500) return Response.json({ error: "Outcome reason must be 4–500 characters." }, { status: 400 });
    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) return Response.json({ error: "A valid idempotency key is required." }, { status: 400 });
    return Response.json({ outcome: await recordBookingOutcome({ actorUserId: viewer.id, bookingId, targetStatus: status, reason, idempotencyKey }) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return bookingErrorResponse(error); }
  }
}
