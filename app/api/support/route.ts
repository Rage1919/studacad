import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import {
  normalizeCaseMessage,
  normalizeSupportCase,
} from "../../../server/support/policy.mjs";
import {
  addSupportMessage,
  createSupportCase,
  listOwnSupportCases,
  supportErrorResponse,
} from "../../../server/support/repository";
export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json(await listOwnSupportCases(viewer), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const normalized = normalizeSupportCase(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json(
      { caseNumber: await createSupportCase(viewer, normalized.value) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const normalized = normalizeCaseMessage(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    return Response.json(
      {
        messageId: await addSupportMessage(viewer, {
          ...normalized.value,
          internal: false,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return supportErrorResponse(error);
    }
  }
}
