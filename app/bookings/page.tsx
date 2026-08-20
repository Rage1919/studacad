"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import "./bookings.css";

type Meeting =
  | null
  | { status: "cancelled" | "preparing" | "needs_support" }
  | { status: "scheduled"; releasesAt: string }
  | { status: "ready"; joinUrl: string };
type Booking = {
  id: string;
  tutorName: string;
  tutorSlug: string;
  format: string;
  examination: string;
  subject: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  priceCredits: number;
  capacity: number;
  activeParticipants: number;
  locationNote: string | null;
  status: string;
  perspective: "learner" | "tutor";
  canCancel: boolean;
  availableActions: Array<"completed" | "no_show" | "disputed">;
  meeting: Meeting;
};
const formatLabel = (format: string) =>
  ({
    online_1to1: "Online private",
    online_group: "Online group",
    tutor_place: "At tutor's place",
    student_place: "At learner's place",
  })[format] ?? format;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notice, setNotice] = useState("Loading bookings…");
  const [busyId, setBusyId] = useState("");
  const [asOf, setAsOf] = useState(0);
  const { refreshWallet } = useLms();
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const result = (await response.json()) as {
        bookings?: Booking[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Unable to load bookings.");
      setBookings(result.bookings ?? []);
      setAsOf(Date.now());
      setNotice("");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to load bookings.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (booking: Booking) => {
    const reason = window
      .prompt(
        "Why are you cancelling this lesson? A full credit refund is issued when cancellation happens before the lesson starts.",
        "Schedule changed",
      )
      ?.trim();
    if (!reason) return;
    if (
      !window.confirm(
        `Cancel the ${new Date(booking.startsAt).toLocaleString("en-BW")} lesson and refund the affected learner credits?`,
      )
    )
      return;
    setBusyId(booking.id);
    setNotice("");
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, idempotencyKey: crypto.randomUUID() }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Unable to cancel the booking.");
      await Promise.all([load(), refreshWallet()]);
      setNotice(
        "Booking cancelled. The full credit refund is in the learner wallet.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to cancel the booking.",
      );
    } finally {
      setBusyId("");
    }
  };

  const recordOutcome = async (
    booking: Booking,
    status: "completed" | "no_show" | "disputed",
  ) => {
    const labels = {
      completed: "mark this lesson complete",
      no_show: "record a learner no-show",
      disputed: "raise a dispute",
    };
    const reason = window
      .prompt(
        `Add a reason to ${labels[status]}.`,
        status === "completed" ? "Lesson delivered" : "Describe what happened",
      )
      ?.trim();
    if (!reason) return;
    setBusyId(booking.id);
    setNotice("");
    try {
      const response = await fetch(`/api/bookings/${booking.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(result.error ?? "Unable to update the booking.");
      await load();
      setNotice(
        status === "disputed"
          ? "The booking dispute has been recorded for review."
          : "Booking outcome recorded.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to update the booking.",
      );
    } finally {
      setBusyId("");
    }
  };

  const [upcoming, past] = useMemo(() => {
    return [
      bookings.filter((booking) => new Date(booking.endsAt).getTime() >= asOf),
      bookings
        .filter((booking) => new Date(booking.endsAt).getTime() < asOf)
        .reverse(),
    ];
  }, [asOf, bookings]);
  const list = (items: Booking[]) => (
    <div className="booking-dashboard-list">
      {items.map((booking) => (
        <article key={`${booking.id}-${booking.perspective}`}>
          <div className="booking-date">
            <strong>
              {new Date(booking.startsAt).toLocaleDateString("en-BW", {
                day: "2-digit",
                month: "short",
              })}
            </strong>
            <span>
              {new Date(booking.startsAt).toLocaleTimeString("en-BW", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div>
            <span className={`booking-status ${booking.status}`}>
              {booking.status.replaceAll("_", " ")}
            </span>
            <h3>
              {booking.examination} {booking.subject}
            </h3>
            <p>
              {booking.perspective === "learner"
                ? `With ${booking.tutorName}`
                : "Tutor view"}{" "}
              · {formatLabel(booking.format)} · {booking.priceCredits} credits
            </p>
            {booking.locationNote && (
              <small>Location: {booking.locationNote}</small>
            )}
            {booking.capacity > 1 && (
              <small>
                {booking.activeParticipants}/{booking.capacity} active
                participants
              </small>
            )}
            {booking.meeting?.status === "scheduled" && (
              <small className="meeting-state">
                Meet link available{" "}
                {new Date(booking.meeting.releasesAt).toLocaleString("en-BW", {
                  timeZone: booking.timezone,
                })}
              </small>
            )}
            {booking.meeting?.status === "preparing" && (
              <small className="meeting-state">
                Google Meet is being prepared.
              </small>
            )}
            {booking.meeting?.status === "needs_support" && (
              <small className="meeting-state warning">
                Meet setup needs support; your booking is still confirmed.
              </small>
            )}
          </div>
          <div className="booking-dashboard-actions">
            {booking.meeting?.status === "ready" && (
              <a
                className="join-meeting"
                href={booking.meeting.joinUrl}
                target="_blank"
                rel="noreferrer"
              >
                Join Google Meet
              </a>
            )}
            {booking.tutorSlug && (
              <Link href={`/tutors/${booking.tutorSlug}`}>Tutor profile</Link>
            )}
            {booking.canCancel && (
              <button
                type="button"
                onClick={() => void cancel(booking)}
                disabled={busyId === booking.id}
              >
                {busyId === booking.id ? "Working…" : "Cancel and refund"}
              </button>
            )}
            {booking.availableActions.map((action) => (
              <button
                type="button"
                key={action}
                onClick={() => void recordOutcome(booking, action)}
                disabled={busyId === booking.id}
              >
                {action === "completed"
                  ? "Mark complete"
                  : action === "no_show"
                    ? "Record no-show"
                    : "Raise dispute"}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );

  return (
    <main className="lms-page bookings-page">
      <LmsHeader current="bookings" />
      <section className="bookings-hero">
        <div>
          <p className="eyebrow">Studacad schedule</p>
          <h1>Your lessons</h1>
          <p>
            See confirmed times, group capacity, and the actions currently
            allowed for each booking.
          </p>
        </div>
        <Link className="primary" href="/tutors">
          Find a tutor
        </Link>
      </section>
      <section className="bookings-shell">
        {notice && (
          <p className="bookings-notice" role="status">
            {notice}
          </p>
        )}
        <div className="bookings-heading">
          <h2>Upcoming</h2>
          <span>
            {upcoming.length} booking{upcoming.length === 1 ? "" : "s"}
          </span>
        </div>
        {upcoming.length ? (
          list(upcoming)
        ) : (
          <div className="bookings-empty">
            <h3>No upcoming lessons</h3>
            <p>
              Choose a verified tutor and a server-confirmed time to create a
              booking.
            </p>
            <Link href="/tutors">Browse tutors →</Link>
          </div>
        )}
        <div className="bookings-heading past">
          <h2>Past</h2>
          <span>{past.length}</span>
        </div>
        {past.length ? (
          list(past)
        ) : (
          <p className="bookings-empty compact">
            Past lessons will appear here.
          </p>
        )}
        <p className="refund-policy">
          Interim cancellation policy: a cancellation before the lesson starts
          returns the full held credit amount. Cancellation is blocked after the
          start time.
        </p>
      </section>
    </main>
  );
}
