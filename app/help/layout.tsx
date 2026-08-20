import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Help centre",
  description:
    "Get help with Studacad learning, bookings, credits, tutor payments, safety, and account requests.",
  path: "/help",
});

export default function HelpLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
