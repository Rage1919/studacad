import { ProtectedPage } from "../components/ProtectedPage";

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPage returnPath="/bookings">{children}</ProtectedPage>;
}
