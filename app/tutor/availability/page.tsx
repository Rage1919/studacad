import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { LmsHeader } from "../../components/LmsHeader";
import { AvailabilityEditor } from "./AvailabilityEditor";
import "./availability.css";

export default async function TutorAvailabilityPage() {
  if (process.env.PAGES_BASE_PATH) return <main className="availability-page"><section className="availability-static"><h1>Tutor availability</h1><p>Availability management is available on the server deployment.</p><Link href="/">Return home</Link></section></main>;
  await requirePageViewer("/tutor/availability", ["tutor"]);
  return <main className="lms-page availability-page">
    <LmsHeader />
    <section className="availability-hero"><div><p className="eyebrow">Tutor workspace</p><h1>Availability and lesson settings</h1><p>Publish recurring hours, protect buffer time, add blackout dates, and keep prices and group capacity current.</p></div><Link href="/bookings">View bookings →</Link></section>
    <AvailabilityEditor />
  </main>;
}
