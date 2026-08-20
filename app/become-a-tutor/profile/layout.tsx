import { ProtectedPage } from "../../components/ProtectedPage";

export default function TutorProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/become-a-tutor/profile">{children}</ProtectedPage>;
}
