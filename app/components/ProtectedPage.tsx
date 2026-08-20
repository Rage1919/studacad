import type { AppRole } from "../../server/db/models";
import { requirePageViewer } from "../../server/auth/viewer";
import Link from "next/link";

export async function ProtectedPage({
  children,
  returnPath,
  roles,
}: {
  children: React.ReactNode;
  returnPath: string;
  roles?: AppRole[];
}) {
  if (process.env.PAGES_BASE_PATH)
    return (
      <main className="lms-page">
        <section className="locked-state">
          <span>i</span>
          <h1>Secure account feature unavailable in this preview</h1>
          <p>
            This page needs the Studacad server, authentication, and production
            database. No account action is available here.
          </p>
          <Link className="primary" href="/">
            Return home
          </Link>
        </section>
      </main>
    );
  await requirePageViewer(returnPath, roles);
  return children;
}
