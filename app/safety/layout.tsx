import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Safety centre",
  description:
    "Learn how to report urgent concerns, protect personal information, and use Studacad safely.",
  path: "/safety",
  type: "article",
});

export default function SafetyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
