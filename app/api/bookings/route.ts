import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { normalizeBookingRequest } from "../../../server/bookings/policy.mjs";
import {
  bookingErrorResponse,
  createConfirmedBooking,
  listBookingsForViewer,
} from "../../../server/bookings/repository";
import { appendCorrelatedAudit } from "../../../server/security/request-audit";
import {
  acceptPolicies,
  supportErrorResponse,
} from "../../../server/support/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json(
      { bookings: await listBookingsForViewer(viewer) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return bookingErrorResponse(error);
    }
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const normalized = normalizeBookingRequest(body);
    if (
      normalized.errors.length ||
      !normalized.value.format ||
      !normalized.value.examination
    ) {
      return Response.json(
        { error: normalized.errors[0] ?? "Invalid booking request." },
        { status: 400 },
      );
    }
    if (body?.acceptPolicies !== true)
      return Response.json(
        {
          error: "Accept the Terms and Cancellation and Refund Policy to book.",
        },
        { status: 400 },
      );
    await acceptPolicies(
      viewer,
      ["terms", "cancellation_refunds", "safety"],
      "booking",
      normalized.value.idempotencyKey,
    );
    const booking = await createConfirmedBooking({
      learnerUserId: viewer.id,
      tutorSlug: normalized.value.tutorSlug,
      format: normalized.value.format,
      examination: normalized.value.examination,
      subject: normalized.value.subject,
      startsAt: normalized.value.startsAt,
      displayTimezone: normalized.value.timezone,
      learnerLocation: normalized.value.learnerLocation || null,
      idempotencyKey: normalized.value.idempotencyKey,
    });
    if (
      booking &&
      typeof booking === "object" &&
      !Array.isArray(booking) &&
      typeof booking.bookingId === "string"
    ) {
      await appendCorrelatedAudit({
        request,
        actorUserId: viewer.id,
        action: "booking.create_request",
        entityType: "booking",
        entityId: booking.bookingId,
      });
    }
    return Response.json(
      { booking },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      try {
        return bookingErrorResponse(error);
      } catch {
        return supportErrorResponse(error);
      }
    }
  }
}
