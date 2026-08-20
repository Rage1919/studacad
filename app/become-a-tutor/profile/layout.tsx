import { ProtectedPage } from "../../components/ProtectedPage";
import { privateMetadata } from "../../lib/seo";

export const metadata = privateMetadata("Tutor application", "Your private tutor application and verification workflow.");

export default function TutorProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/become-a-tutor/profile">{children}</ProtectedPage>;
}
