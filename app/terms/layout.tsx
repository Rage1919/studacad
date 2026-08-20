import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Terms of service",
  description:
    "Read the terms that govern learner accounts, bookings, credits, courses, conduct, and use of Studacad.",
  path: "/terms",
  type: "article",
});

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
