import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { getAdminSupport } from "../../../server/support/repository";
import { SupportOperations } from "./SupportOperations";
import "./support.css";
export default async function Page() {
  const viewer = await requirePageViewer("/admin/support", ["admin"]);
  return (
    <main className="support-admin">
      <nav>
        <Link href="/admin">← Admin</Link>
      </nav>
      <header>
        <p className="eyebrow">Least-privilege operations</p>
        <h1>Support and safety queue</h1>
        <p>
          Urgent safety cases sort by response target. Public replies notify the
          requester; internal notes remain administrator-only and every action
          is audited.
        </p>
      </header>
      <SupportOperations
        initial={await getAdminSupport()}
        viewerId={viewer.id}
      />
    </main>
  );
}
