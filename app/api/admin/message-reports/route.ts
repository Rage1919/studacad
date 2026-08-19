import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import {
  authErrorResponse,
  requireViewer,
} from "../../../../server/auth/viewer";
import {
  listMessageReports,
  messagingErrorResponse,
  resolveMessageReport,
} from "../../../../server/messages/repository";

export async function GET() {
  try {
    await requireViewer(["admin"]);
    return Response.json(
      { reports: await listMessageReports() },
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

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
    const admin = await requireViewer(["admin"]);
    const body = (await request.json().catch(() => null)) as {
      reportId?: string;
      status?: string;
      resolutionNote?: string;
    } | null;
    const status = new Set(["reviewing", "resolved", "dismissed"]).has(
      body?.status ?? "",
    )
      ? (body!.status as "reviewing" | "resolved" | "dismissed")
      : null;
    const resolutionNote = body?.resolutionNote?.trim() ?? "";
    if (
      !body?.reportId ||
      !status ||
      resolutionNote.length < 5 ||
      resolutionNote.length > 1000
    )
      return Response.json(
        { error: "A report, valid status, and resolution note are required." },
        { status: 400 },
      );
    return Response.json({
      report: await resolveMessageReport({
        admin,
        reportId: body.reportId,
        status,
        resolutionNote,
      }),
    });
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
