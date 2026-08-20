import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("My learning", "Private purchased courses and learning progress.");

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/learn">{children}</ProtectedPage>;
}
