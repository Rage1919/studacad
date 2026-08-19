import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";
import { normalizeAvailabilityUpdate } from "../../../../server/bookings/policy.mjs";
import { bookingErrorResponse, getOwnAvailability, replaceOwnAvailability } from "../../../../server/bookings/repository";

export async function GET() {
  try {
    const viewer = await requireViewer(["tutor"]);
    return Response.json(await getOwnAvailability(viewer.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return bookingErrorResponse(error); }
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["tutor"]);
    const normalized = normalizeAvailabilityUpdate(await request.json().catch(() => null));
    if (normalized.errors.length) return Response.json({ error: normalized.errors[0] }, { status: 400 });
    await replaceOwnAvailability(viewer.id, normalized.value.rules, normalized.value.exceptions, normalized.value.settings);
    return Response.json(await getOwnAvailability(viewer.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return bookingErrorResponse(error); }
  }
}
