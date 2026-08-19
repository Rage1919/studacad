import { provisionerAuthorized } from "../../../../../server/meet/internal-auth.mjs";
import {
  meetingErrorResponse,
  provisionPendingMeetings,
} from "../../../../../server/meet/repository";

export async function POST(request: Request) {
  if (
    !provisionerAuthorized(
      request.headers.get("authorization"),
      process.env.MEET_PROVISIONER_SECRET,
    )
  ) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  try {
    return Response.json(
      { result: await provisionPendingMeetings(5) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return meetingErrorResponse(error);
  }
}
