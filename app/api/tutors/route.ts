import { listPublicTutors, onboardingErrorResponse } from "../../../server/tutor-onboarding/repository";

export async function GET() {
  try {
    const tutors = await listPublicTutors();
    return Response.json({ tutors }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return onboardingErrorResponse(error);
  }
}
