import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata(
  "Contact support",
  "Your private Studacad support cases.",
);

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
