import { ProtectedPage } from "../components/ProtectedPage";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/admin" roles={["admin"]}>{children}</ProtectedPage>;
}
