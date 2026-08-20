import { readRuntimeEnvironment } from "../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../server/auth/csrf.mjs";
import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { normalizeMessageRequest } from "../../../server/messages/policy.mjs";
import {
  listMessagesForViewer,
  messagingErrorResponse,
  sendMessage,
} from "../../../server/messages/repository";

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer();
    const tutorId =
      new URL(request.url).searchParams.get("tutorId")?.trim().toLowerCase() ||
      undefined;
    return Response.json(
      { messages: await listMessagesForViewer(viewer, tutorId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      return messagingErrorResponse(error);
    }
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const viewer = await requireViewer();
    const normalized = normalizeMessageRequest(
      await request.json().catch(() => null),
    );
    if (normalized.errors.length)
      return Response.json({ error: normalized.errors[0] }, { status: 400 });
    const message = await sendMessage({ viewer, ...normalized.value });
    return Response.json(
      { message, delivery: message?.providerStatus ? "whatsapp" : "in_app" },
      { status: 201, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    try {
      return authErrorResponse(error);
    } catch {
      return messagingErrorResponse(error);
    }
  }
}
