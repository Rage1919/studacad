import { authErrorResponse, requireViewer } from "../../../server/auth/viewer";
import { getWalletSnapshot } from "../../../server/wallet/repository";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const wallet = await getWalletSnapshot(viewer.id);
    return Response.json(wallet, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return authErrorResponse(error);
  }
}
