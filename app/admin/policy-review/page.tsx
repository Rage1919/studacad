import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { getPolicyReviewRegister } from "../../../server/support/repository";
import { PolicyReviewRegister } from "./PolicyReviewRegister";
import "./review.css";
export default async function Page() {
  await requirePageViewer("/admin/policy-review", ["admin"]);
  return (
    <main className="policy-admin">
      <nav>
        <Link href="/admin">← Admin</Link>
      </nav>
      <header>
        <p className="eyebrow">Governance</p>
        <h1>Policy review register</h1>
        <p>
          Record only reviews that actually occurred and link durable evidence.
          This register does not substitute for qualified Botswana,
          cross-border, privacy, safeguarding, or accessibility advice.
        </p>
      </header>
      <PolicyReviewRegister initial={await getPolicyReviewRegister()} />
    </main>
  );
}
