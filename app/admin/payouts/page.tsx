import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { getAdminPayouts } from "../../../server/earnings/repository";
import { PayoutOperations } from "./PayoutOperations";
import "./payouts.css";
export default async function AdminPayoutsPage() {
  const viewer = await requirePageViewer("/admin/payouts", ["admin"]);
  const data = await getAdminPayouts();
  return (
    <main className="payout-admin">
      <nav>
        <Link href="/admin">← Admin</Link>
      </nav>
      <header>
        <p className="eyebrow">Finance operations</p>
        <h1>Payouts and booking refunds</h1>
        <p>
          Manual four-eyes workflow using masked destinations and external
          verification references only.
        </p>
      </header>
      <PayoutOperations initial={data} viewerId={viewer.id} />
    </main>
  );
}
