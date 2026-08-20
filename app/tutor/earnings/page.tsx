import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { getTutorEarnings } from "../../../server/earnings/repository";
import { EarningsClient } from "./EarningsClient";
import "./earnings.css";

export default async function TutorEarningsPage() {
  if (process.env.PAGES_BASE_PATH)
    return (
      <main className="earnings-page">
        <h1>Tutor earnings</h1>
        <p>Earnings are available on the server deployment.</p>
      </main>
    );
  const viewer = await requirePageViewer("/tutor/earnings", ["tutor"]);
  const snapshot = await getTutorEarnings(viewer);
  return (
    <main className="earnings-page">
      <nav>
        <Link href="/tutor">← Tutor workspace</Link>
      </nav>
      <header>
        <p className="eyebrow">Tutor finance</p>
        <h1>Earnings and payouts</h1>
        <p>
          Studacad charges 20%. Net earnings become available seven days after
          the lesson, unless disputed.
        </p>
      </header>
      <EarningsClient initial={snapshot} />
    </main>
  );
}
