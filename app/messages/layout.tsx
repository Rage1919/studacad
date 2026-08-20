import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Messages", "Private Studacad tutor conversations.");

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/messages">{children}</ProtectedPage>;
}
