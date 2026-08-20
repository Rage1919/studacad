import { ProtectedPage } from "../components/ProtectedPage";
import { privateMetadata } from "../lib/seo";

export const metadata = privateMetadata("My bookings", "Private Studacad booking records.");

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/bookings">{children}</ProtectedPage>;
}
