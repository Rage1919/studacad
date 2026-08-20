import { messageWorkerAuthorized } from "../../../../../server/messages/internal-auth.mjs";
import {
  deliverQueuedMessages,
  messagingErrorResponse,
} from "../../../../../server/messages/repository";

export async function POST(request: Request) {
  if (
    !messageWorkerAuthorized(
      request.headers.get("authorization"),
      process.env.MESSAGE_DELIVERY_SECRET,
    )
  )
    return Response.json({ error: "Not found." }, { status: 404 });
  try {
    return Response.json(
      { result: await deliverQueuedMessages(20) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return messagingErrorResponse(error);
  }
}
