import { publicMetadata } from "../lib/seo";

export const metadata = publicMetadata({
  title: "Cancellation and refund policy",
  description:
    "Read when lesson cancellations receive a full credit refund and how to raise a dispute after a lesson starts.",
  path: "/cancellation-refunds",
  type: "article",
});

export default function CancellationRefundsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
