import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Find approved Botswana subject tutors",
  description:
    "Browse approved PSLE, JCE, and BGCSE tutors by subject, live availability, recorded rating, and credit price.",
  path: "/tutors",
});

export default function TutorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
