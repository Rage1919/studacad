import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("Administration", "Authorised Studacad operations.");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/admin" roles={["admin"]}>{children}</ProtectedPage>;
}
