import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Cookie and storage notice",
  description:
    "Read how Studacad uses necessary browser storage and the controls required before optional analytics can be enabled.",
  path: "/cookies",
  type: "article",
});

export default function CookiesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
