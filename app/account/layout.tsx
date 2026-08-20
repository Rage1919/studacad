import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata(
  "Account settings",
  "Your private Studacad account settings.",
);

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
