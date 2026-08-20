import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { getLearningSnapshot, learningErrorResponse } from "../../../server/learning/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json(await getLearningSnapshot(viewer.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}
