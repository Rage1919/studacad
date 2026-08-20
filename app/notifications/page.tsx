import Link from "next/link";
import { requirePageViewer } from "../../server/auth/viewer";
import { getNotificationCenter } from "../../server/notifications/repository";
import { NotificationCenter } from "./NotificationCenter";
import "./notifications.css";
export default async function NotificationsPage() {
  if (process.env.PAGES_BASE_PATH)
    return (
      <main className="notification-page">
        <h1>Notifications</h1>
        <p>Notifications are available on the server deployment.</p>
      </main>
    );
  const viewer = await requirePageViewer("/notifications");
  return (
    <main className="notification-page">
      <nav>
        <Link href="/account">← Account</Link>
      </nav>
      <header>
        <p className="eyebrow">Account updates</p>
        <h1>Notifications</h1>
        <p>
          Security, booking, and financial email remains on. You control
          reminder and new-message email below.
        </p>
      </header>
      <NotificationCenter initial={await getNotificationCenter(viewer)} />
    </main>
  );
}
