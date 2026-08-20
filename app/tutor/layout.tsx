import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata(
  "Tutor workspace",
  "Private tutor tools and legacy profile links.",
);

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
