import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata(
  "Notifications",
  "Your private Studacad notification center.",
);

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
