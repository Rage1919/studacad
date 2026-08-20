import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { normalizeFavourite } from "../../../server/learning/policy.mjs";
import { learningErrorResponse, listTutorFavourites, setTutorFavourite } from "../../../server/learning/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json({ tutorProfileIds: await listTutorFavourites(viewer.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}

async function mutate(request: Request, favourite: boolean) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer(["learner"]);
    const normalized = normalizeFavourite(await request.json().catch(() => null));
    if (!normalized.valid) return Response.json({ error: "A valid tutor is required." }, { status: 400 });
    await setTutorFavourite(viewer.id, normalized.tutorProfileId, favourite);
    return Response.json({ tutorProfileId: normalized.tutorProfileId, favourite }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof CsrfError) return Response.json({ error: error.message }, { status: 403 });
    try { return authErrorResponse(error); } catch { return learningErrorResponse(error); }
  }
}

export async function PUT(request: Request) { return mutate(request, true); }
export async function DELETE(request: Request) { return mutate(request, false); }
