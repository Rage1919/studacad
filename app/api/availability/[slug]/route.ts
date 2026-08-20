import { bookingErrorResponse, listAvailableSlots } from "../../../../server/bookings/repository";
import { normalizeSlotQuery } from "../../../../server/bookings/policy.mjs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Tutor not found." }, { status: 404 });
    const query = new URL(request.url).searchParams;
    const normalized = normalizeSlotQuery({
      format: query.get("format"), examination: query.get("examination"), subject: query.get("subject"),
      from: query.get("from"), to: query.get("to")
    });
    if (normalized.errors.length || !normalized.value.format || !normalized.value.examination) {
      return Response.json({ error: normalized.errors[0] ?? "Invalid availability request." }, { status: 400 });
    }
    const slots = await listAvailableSlots({
      tutorSlug: slug, from: normalized.value.from, to: normalized.value.to,
      format: normalized.value.format, examination: normalized.value.examination, subject: normalized.value.subject
    });
    return Response.json({ slots }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } });
  } catch (error) {
    return bookingErrorResponse(error);
  }
}
