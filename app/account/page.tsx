import Link from "next/link";
import { requirePageViewer } from "../../server/auth/viewer";
import AccountForm from "./AccountForm";
import "./account.css";

export default async function AccountPage() {
  if (process.env.PAGES_BASE_PATH) return <main className="account-page"><section><h1>Account settings</h1><p>Account settings are available on the server deployment.</p><Link href="/">Return home</Link></section></main>;
  const viewer = await requirePageViewer("/account");
  return <main className="account-page"><section>
    <p className="eyebrow">Account</p><h1>Your Studacad profile</h1>
    <p className="account-email">Signed in as {viewer.email}</p>
    <AccountForm initial={{ displayName: viewer.displayName, phoneE164: viewer.phoneE164 ?? "", timezone: viewer.timezone }} roles={viewer.roles} />
    <Link href="/">← Return home</Link>
  </section></main>;
}
