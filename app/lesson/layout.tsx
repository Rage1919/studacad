import { ProtectedPage } from "../components/ProtectedPage";

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/lesson">{children}</ProtectedPage>;
}
