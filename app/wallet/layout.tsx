import { ProtectedPage } from "../components/ProtectedPage";

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/wallet">{children}</ProtectedPage>;
}
