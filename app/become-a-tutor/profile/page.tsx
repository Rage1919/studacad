import type { Metadata } from "next";
import Link from "next/link";
import { LmsHeader } from "../../components/LmsHeader";
import { TutorProfileForm } from "./TutorProfileForm";
import "./profile.css";

export const metadata: Metadata = {
  title: "Complete your tutor profile | Studacad",
  description: "Add your teaching background, lesson preferences, availability, and verification details to complete your Studacad tutor profile."
};

export default function TutorProfilePage() {
  return (
    <main className="tutor-onboarding-page">
      <LmsHeader current="become-tutor" />
      <section className="tutor-onboarding-shell">
        <div className="tutor-onboarding-topbar">
          <Link href="/become-a-tutor#apply"><span aria-hidden="true">←</span> Back to overview</Link>
          <span>Demo application · Saved on this screen only</span>
        </div>
        <TutorProfileForm />
      </section>
    </main>
  );
}
