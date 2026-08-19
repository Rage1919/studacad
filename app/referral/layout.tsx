import { ProtectedPage } from "../components/ProtectedPage";

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/referral">{children}</ProtectedPage>;
}
