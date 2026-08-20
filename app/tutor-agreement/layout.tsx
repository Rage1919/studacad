import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Tutor agreement",
  description:
    "Read the Studacad tutor agreement covering approval, lessons, safeguarding, earnings, payouts, and conduct.",
  path: "/tutor-agreement",
  type: "article",
});

export default function TutorAgreementLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
