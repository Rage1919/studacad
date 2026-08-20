import Link from "next/link";
import { requirePageViewer } from "../../server/auth/viewer";
import { listOwnSupportCases } from "../../server/support/repository";
import { SupportCenter } from "./SupportCenter";
import "./contact.css";
export default async function ContactPage() {
  if (process.env.PAGES_BASE_PATH)
    return (
      <main className="contact-page">
        <h1>Contact support</h1>
        <p>Private support cases are available on the server deployment.</p>
        <Link href="/help">Help centre</Link>
      </main>
    );
  const viewer = await requirePageViewer("/contact");
  return (
    <main className="contact-page">
      <nav>
        <Link href="/help">← Help centre</Link>
      </nav>
      <header>
        <p className="eyebrow">Private support</p>
        <h1>Contact Studacad</h1>
        <p>
          Signed in as {viewer.email}. Every request receives a case ID. Do not
          include passwords, one-time links, full bank details, or identity
          documents.
        </p>
      </header>
      <SupportCenter initial={await listOwnSupportCases(viewer)} />
    </main>
  );
}
