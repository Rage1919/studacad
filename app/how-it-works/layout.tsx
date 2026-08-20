import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "How Studacad works",
  description:
    "Learn how Studacad connects Botswana learners with approved tutors, revision courses, bookings, and protected account tools.",
  path: "/how-it-works",
});

export default function HowItWorksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
