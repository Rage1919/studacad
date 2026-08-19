import { listPublicTutors, onboardingErrorResponse } from "../../../../server/tutor-onboarding/repository";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const tutor = (await listPublicTutors(slug))[0] ?? null;
    return Response.json({ tutor }, {
      status: tutor ? 200 : 404,
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
    });
  } catch (error) {
    return onboardingErrorResponse(error);
  }
}
