import { ProtectedPage } from "../components/ProtectedPage";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/learn">{children}</ProtectedPage>;
}
