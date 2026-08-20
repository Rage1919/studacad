import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Credits wallet", "Your private Studacad wallet and ledger activity.");

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/wallet">{children}</ProtectedPage>;
}
