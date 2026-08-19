import { ProtectedPage } from "../components/ProtectedPage";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/messages">{children}</ProtectedPage>;
}
