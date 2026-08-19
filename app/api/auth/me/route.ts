import { authErrorResponse, requireViewer } from "../../../../server/auth/viewer";

export async function GET() {
  try {
    const viewer = await requireViewer();
    return Response.json({
      user: {
        email: viewer.email,
        displayName: viewer.displayName,
        roles: viewer.roles
      }
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
