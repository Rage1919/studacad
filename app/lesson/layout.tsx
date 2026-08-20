import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Course lesson", "Private purchased lesson content and progress.");

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/lesson">{children}</ProtectedPage>;
}
