import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Referrals", "Your private Studacad referral activity.");

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/referral">{children}</ProtectedPage>;
}
