"use client";
import { useState } from "react";
type Data = {
  notifications: Array<{
    id: string;
    template_key: string;
    category: string;
    status: string;
    payload: unknown;
    created_at: string;
    read_at: string | null;
  }>;
  preferences: { bookingReminderEmail: boolean; newMessageEmail: boolean };
};
const labels: Record<string, string> = {
  "booking.confirmed": "Lesson confirmed",
  "booking.rescheduled": "Lesson rescheduled",
  "booking.cancelled": "Lesson cancelled",
  "booking.reminder_24h": "Lesson tomorrow",
  "booking.reminder_1h": "Lesson starting soon",
  "meeting.ready": "Online lesson room ready",
  "message.received": "New message",
  "payment.deposit_recorded": "Credits added",
  "booking.refunded": "Refund recorded",
  "payout.requested": "Payout requested",
  "payout.reviewing": "Payout under review",
  "payout.processing": "Payout processing",
  "payout.paid": "Payout completed",
  "payout.failed": "Payout needs attention",
  "payout.cancelled": "Payout cancelled",
};
export function NotificationCenter({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial);
  const [notice, setNotice] = useState("");
  const patch = async (body: unknown) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as Data & { error?: string };
    if (response.ok && "notifications" in payload) setData(payload);
    setNotice(
      response.ok
        ? "Notification settings saved."
        : (payload.error ?? "Unable to save notifications."),
    );
  };
  const save = () =>
    void patch({
      action: "preferences",
      bookingReminderEmail: data.preferences.bookingReminderEmail,
      newMessageEmail: data.preferences.newMessageEmail,
    });
  const read = (id: string) => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.id === id
          ? { ...item, read_at: new Date().toISOString(), status: "read" }
          : item,
      ),
    }));
    void patch({ action: "read", id });
  };
  return (
    <>
      <section className="preference-card">
        <h2>Email preferences</h2>
        <label>
          <input
            type="checkbox"
            checked={data.preferences.bookingReminderEmail}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  bookingReminderEmail: event.target.checked,
                },
              }))
            }
          />{" "}
          Lesson reminders at 24 hours and one hour
        </label>
        <label>
          <input
            type="checkbox"
            checked={data.preferences.newMessageEmail}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                preferences: {
                  ...current.preferences,
                  newMessageEmail: event.target.checked,
                },
              }))
            }
          />{" "}
          New message alerts
        </label>
        <button onClick={save}>Save preferences</button>
        <small>
          Essential security, application, booking change, meeting, payment,
          refund, and payout notifications cannot be disabled.
        </small>
        {notice && <p role="status">{notice}</p>}
      </section>
      <section className="notification-list">
        <h2>Recent updates</h2>
        {data.notifications.map((item) => (
          <button
            key={item.id}
            className={item.read_at ? "read" : "unread"}
            onClick={() => read(item.id)}
          >
            <span>
              {labels[item.template_key] ??
                item.template_key.replaceAll(".", " ")}
            </span>
            <time>{new Date(item.created_at).toLocaleString("en-BW")}</time>
            <small>{item.read_at ? "Read" : "Mark as read"}</small>
          </button>
        ))}
        {!data.notifications.length && <p>No notifications yet.</p>}
      </section>
    </>
  );
}
