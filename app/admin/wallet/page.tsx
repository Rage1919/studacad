import Link from "next/link";
import { LmsHeader } from "../../components/LmsHeader";
import { VerifiedDepositForm } from "./VerifiedDepositForm";
import "./wallet-admin.css";

export default function WalletAdminPage() {
  return <main className="lms-page wallet-admin-page">
    <LmsHeader />
    <section className="wallet-admin-hero">
      <div><p className="eyebrow">Wallet operations</p><h1>Record a verified deposit</h1><p>This is a temporary, audited workflow for deposits confirmed outside Studacad while online checkout is deferred.</p></div>
      <Link href="/admin">← Content admin</Link>
    </section>
    <section className="admin-workspace wallet-admin-workspace">
      <div className="form-intro"><span>1:1</span><div><p className="eyebrow">Fixed credit policy</p><h2>1 BWP = 1 credit</h2><p>Only record funds after verifying the bank or cash reference. Reusing the same idempotency key is safe; changing the details with a reused key is rejected.</p></div></div>
      <VerifiedDepositForm />
    </section>
  </main>;
}
