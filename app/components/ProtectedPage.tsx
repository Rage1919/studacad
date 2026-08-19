import type { AppRole } from "../../server/db/models";
import { requirePageViewer } from "../../server/auth/viewer";

export async function ProtectedPage({
  children,
  returnPath,
  roles
}: {
  children: React.ReactNode;
  returnPath: string;
  roles?: AppRole[];
}) {
  if (!process.env.PAGES_BASE_PATH) await requirePageViewer(returnPath, roles);
  return children;
}
