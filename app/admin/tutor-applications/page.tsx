import Link from "next/link";
import { LmsHeader } from "../../components/LmsHeader";
import { ReviewQueue } from "./ReviewQueue";
import "./review.css";

export default function TutorApplicationsAdminPage() {
  return <main className="lms-page review-page">
    <LmsHeader />
    <section className="review-hero"><div><p className="eyebrow">Tutor verification</p><h1>Review applicants and publish trusted profiles</h1><p>Validate identity, qualifications, teaching details, and private evidence before a tutor can appear in search or accept bookings.</p></div><Link href="/admin">← Content admin</Link></section>
    <ReviewQueue />
  </main>;
}
