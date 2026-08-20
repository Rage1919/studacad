import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Privacy notice",
  description:
    "Read how Studacad collects, uses, protects, retains, and responds to requests about personal information.",
  path: "/privacy",
  type: "article",
});

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
