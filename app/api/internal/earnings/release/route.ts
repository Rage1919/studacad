import { earningsWorkerAuthorized } from "../../../../../server/earnings/internal-auth.mjs";
import {
  earningsErrorResponse,
  releaseTutorEarnings,
} from "../../../../../server/earnings/repository";
export async function POST(request: Request) {
  if (
    !earningsWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.EARNINGS_WORKER_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  try {
    return Response.json(
      { released: await releaseTutorEarnings(100) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return earningsErrorResponse(error);
  }
}
