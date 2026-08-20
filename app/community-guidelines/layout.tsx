import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Community guidelines",
  description:
    "Read the standards for respectful, safe communication and participation across Studacad.",
  path: "/community-guidelines",
  type: "article",
});

export default function CommunityGuidelinesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
