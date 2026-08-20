import Link from "next/link";
import { requirePageViewer } from "../../../server/auth/viewer";
import { getNotificationFailures } from "../../../server/notifications/repository";
import "./notifications.css";
export default async function AdminNotificationsPage() {
  await requirePageViewer("/admin/notifications", ["admin"]);
  const data = await getNotificationFailures();
  return (
    <main className="notification-admin">
      <nav>
        <Link href="/admin">← Admin</Link>
      </nav>
      <header>
        <p className="eyebrow">Delivery operations</p>
        <h1>Notification failures</h1>
        <p>
          Dead letters remain visible after five bounded attempts. Suppressions
          protect users after a bounce or complaint.
        </p>
      </header>
      <section>
        <h2>Dead letters</h2>
        {data.deadLetters.map((item) => (
          <article key={item.id}>
            <strong>{item.template_key}</strong>
            <span>
              {item.channel} · {item.attempt_count} attempts
            </span>
            <small>
              {item.failure_reason ?? "Unknown provider failure"} ·{" "}
              {item.dead_lettered_at}
            </small>
          </article>
        ))}
        {!data.deadLetters.length && <p>No dead letters.</p>}
      </section>
      <section>
        <h2>Email suppressions</h2>
        {data.suppressions.map((item) => (
          <article key={item.user_id}>
            <strong>{item.reason}</strong>
            <span>User {item.user_id}</span>
            <small>Provider event {item.provider_event_id}</small>
          </article>
        ))}
        {!data.suppressions.length && <p>No suppressed recipients.</p>}
      </section>
    </main>
  );
}
