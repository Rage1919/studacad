import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Accessibility statement",
  description:
    "Read Studacad's WCAG 2.2 AA accessibility target, supported features, known limits, and contact route.",
  path: "/accessibility",
  type: "article",
});

export default function AccessibilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
