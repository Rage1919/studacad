"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LmsHeader } from "../components/LmsHeader";
import { useLms } from "../components/LmsProvider";
import type { Tutor } from "../lib/tutors";
import type { TutorMessage } from "../lib/tutorMessages";
import { useTutorFavourites } from "../lib/useTutorFavourites";
import { useTutorMessages } from "../lib/useTutorMessages";
import { useDialogFocus } from "../lib/useDialogFocus";

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 5.5h14v10H9l-4 3v-13Z" />
    <path d="M9 9h6M9 12h4" />
  </svg>
);
const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={filled ? "filled" : ""}
  >
    <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" />
  </svg>
);
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 16V3m0 0L8 7m4-4 4 4" />
    <path d="M7 10H5v10h14V10h-2" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4A8 8 0 1 1 20 11.6Z" />
    <path d="M8.5 7.8c.4 2.8 2.6 5 5.4 5.6l1.1-1.1 2 .9-.3 2c-.2.8-1 1.3-1.8 1.2-5.1-.7-9-4.7-9.4-9.8-.1-.8.5-1.6 1.3-1.8l2-.2.8 2.1-1.1 1.1Z" />
  </svg>
);
type SessionFormat = Tutor["sessionFormats"][number];
type ScheduleMode = "private" | "group";

const sessionOptions: Array<{ id: SessionFormat; label: string }> = [
  { id: "online-1to1", label: "Online private" },
  { id: "online-group", label: "Online group" },
  { id: "tutor-place", label: "At tutor's place" },
  { id: "student-place", label: "At student's place" },
];

type AvailableSlot = {
  startsAt: string;
  endsAt: string;
  timezone: string;
  priceCredits: number;
  capacity: number;
  remainingCapacity: number;
};

const startOfWeek = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - result.getDay());
  return result;
};

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const displaySlot = (slot: string) => {
  const date = new Date(slot);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("en-BW", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : slot;
};

export default function TutorProfilePage({ slug }: { slug?: string }) {
  const { credits, refreshWallet } = useLms();
  const {
    favouriteIds,
    ready: favouritesReady,
    toggleFavourite,
  } = useTutorFavourites();
  const [tutor, setTutor] = useState<Tutor | null | undefined>(undefined);
  const [tutorLoadError, setTutorLoadError] = useState("");
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [booked, setBooked] = useState(false);
  const [bookedLabel, setBookedLabel] = useState("");
  const [bookedDuration, setBookedDuration] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] =
    useState<SessionFormat>("online-1to1");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("private");
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [selectedLessonSlots, setSelectedLessonSlots] = useState<
    Record<ScheduleMode, string[]>
  >({ private: [], group: [] });
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [studentAddress, setStudentAddress] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageNotice, setMessageNotice] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const closeSchedule = useCallback(() => setScheduleOpen(false), []);
  const closeMessage = useCallback(() => setMessageOpen(false), []);
  const scheduleDialogRef = useDialogFocus(scheduleOpen, closeSchedule);
  const messageDialogRef = useDialogFocus(messageOpen, closeMessage);
  const {
    messages: messageHistory,
    error: messageLoadError,
    refresh: refreshMessages,
  } = useTutorMessages(tutor?.id);

  useEffect(() => {
    const id =
      slug ?? new URLSearchParams(window.location.search).get("id") ?? "";
    setTutor(undefined);
    setTutorLoadError("");
    void fetch(`/api/tutors/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const result = (await response.json()) as {
          tutor?: Tutor | null;
          error?: string;
        };
        if (response.status === 404) {
          setTutor(null);
          return;
        }
        if (!response.ok)
          throw new Error(result.error ?? "Unable to load the tutor profile.");
        setTutor(result.tutor ?? null);
      })
      .catch((error) => {
        setTutor(null);
        setTutorLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load the tutor profile.",
        );
      });
  }, [profileAttempt, slug]);

  useEffect(() => {
    if (!tutor) return;
    const from = new Date(weekStart);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    const query = new URLSearchParams({
      format: selectedFormat,
      examination: tutor.examination,
      subject: tutor.subject,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    setSlotsLoading(true);
    setSlotsError("");
    void fetch(
      `/api/availability/${encodeURIComponent(tutor.id)}?${query.toString()}`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          slots?: AvailableSlot[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error ?? "Unable to load availability.");
        setAvailableSlots(result.slots ?? []);
      })
      .catch((error) => {
        setAvailableSlots([]);
        setSlotsError(
          error instanceof Error
            ? error.message
            : "Unable to load availability.",
        );
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedFormat, tutor, weekStart]);

  useEffect(() => {
    if (!tutor || tutor.sessionFormats.includes(selectedFormat)) return;
    const firstFormat = tutor.sessionFormats[0];
    if (firstFormat) setSelectedFormat(firstFormat);
  }, [selectedFormat, tutor]);

  if (tutor === undefined)
    return (
      <main className="lms-page">
        <LmsHeader />
        <div className="loading-state">Loading tutor profile…</div>
      </main>
    );

  if (!tutor && tutorLoadError)
    return (
      <main className="lms-page">
        <LmsHeader />
        <section className="locked-state">
          <span>!</span>
          <h1>Tutor profile is temporarily unavailable</h1>
          <p>{tutorLoadError}</p>
          <button
            className="primary"
            onClick={() => setProfileAttempt((value) => value + 1)}
          >
            Try again
          </button>
        </section>
      </main>
    );

  if (!tutor)
    return (
      <main className="lms-page">
        <LmsHeader />
        <section className="locked-state">
          <span>?</span>
          <h1>Tutor not found</h1>
          <p>This tutor profile may no longer be available.</p>
          <Link className="primary" href="/tutors">
            Browse Studacad tutors
          </Link>
        </section>
      </main>
    );

  const isFavourite = favouriteIds.includes(tutor.profileId ?? tutor.id);
  const availableSessions = sessionOptions.filter((option) =>
    tutor.sessionFormats.includes(option.id),
  );
  const session =
    availableSessions.find((option) => option.id === selectedFormat) ??
    availableSessions[0];
  const selectedServerSlot = availableSlots.find((slot) =>
    selectedLessonSlots[
      selectedFormat === "online-group" ? "group" : "private"
    ].includes(slot.startsAt),
  );
  const sessionPrice = selectedServerSlot?.priceCredits ?? tutor.price;
  const isOnlineSession =
    selectedFormat === "online-1to1" || selectedFormat === "online-group";
  const activeScheduleMode: ScheduleMode =
    selectedFormat === "online-group" ? "group" : "private";
  const activeLessonSlots = selectedLessonSlots[activeScheduleMode];
  const selectedSlot = activeLessonSlots[0] ?? "";
  const bookingTotal = sessionPrice * activeLessonSlots.length;
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const toggleScheduleSlot = (mode: ScheduleMode, slot: string) =>
    setSelectedLessonSlots((current) => ({
      ...current,
      [mode]: current[mode].includes(slot) ? [] : [slot],
    }));

  const changeWeek = (direction: number) =>
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + direction * 7);
      return next;
    });

  const confirmBooking = async () => {
    if (selectedFormat === "student-place" && !studentAddress.trim()) {
      setNotice(
        "Add the learner's address before booking an at-home tutorial.",
      );
      return;
    }
    if (!selectedSlot) return;
    if (
      !window.confirm(
        "Confirm this booking and accept the current Terms, Safety rules, and Cancellation and Refund Policy?",
      )
    )
      return;
    setBookingLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorSlug: tutor.id,
          format: selectedFormat,
          examination: tutor.examination,
          subject: tutor.subject,
          startsAt: selectedSlot,
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "Africa/Gaborone",
          learnerLocation:
            selectedFormat === "student-place" ? studentAddress.trim() : "",
          idempotencyKey: crypto.randomUUID(),
          acceptPolicies: true,
        }),
      });
      const result = (await response.json()) as {
        booking?: { bookingId?: string; endsAt?: string };
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Unable to create the booking.");
      setBooked(true);
      setBookedLabel(session.label);
      setBookedDuration(
        `${Math.round((new Date(result.booking?.endsAt ?? selectedSlot).getTime() - new Date(selectedSlot).getTime()) / 60000)} minutes`,
      );
      setBookedSlots([selectedSlot]);
      setNotice(`${session.label} with ${tutor.name} is confirmed.`);
      await refreshWallet();
    } catch (error) {
      setBooked(false);
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to create the booking.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleFavourite = async () => {
    const saved = await toggleFavourite(tutor.profileId ?? tutor.id);
    setActionNotice(
      saved === null
        ? "Unable to update favourites."
        : saved
          ? `${tutor.name} added to your favourites.`
          : `${tutor.name} removed from your favourites.`,
    );
  };

  const shareTutor = async () => {
    const shareData = {
      title: `${tutor.name} on Studacad`,
      text: `View ${tutor.name}'s ${tutor.examination} ${tutor.subject} tutor profile.`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setActionNotice("Tutor profile shared.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setActionNotice("Tutor profile link copied.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const textArea = document.createElement("textarea");
      textArea.value = shareData.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setActionNotice("Tutor profile link copied.");
    }
  };

  const reportTutorConcern = async () => {
    const reason = window
      .prompt(
        "Describe the tutor safety or conduct concern. Do not include passwords, bank details, or identity documents.",
      )
      ?.trim();
    if (!reason) return;
    try {
      const response = await fetch(
        `/api/tutors/${encodeURIComponent(tutor.id)}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      const result = (await response.json()) as {
        caseNumber?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(result.error ?? "Unable to submit the report.");
      setActionNotice(`Report received as support case ${result.caseNumber}.`);
    } catch (error) {
      setActionNotice(
        error instanceof Error ? error.message : "Unable to submit the report.",
      );
    }
  };

  const sendMessage = async () => {
    const cleanMessage = messageText.trim();
    if (!cleanMessage) {
      setMessageNotice("Write a message before sending.");
      setMessageError(true);
      return;
    }
    setMessageError(false);
    setMessageSending(true);
    setMessageNotice(`Sending your message to ${tutor.name}…`);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: tutor.id,
          text: cleanMessage,
          clientMessageId: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json()) as {
        message?: TutorMessage;
        delivery?: "in_app" | "whatsapp";
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "Message delivery failed");
      setMessageText("");
      setMessageNotice(
        payload.message?.providerStatus
          ? `Message sent in Studacad. WhatsApp delivery is ${payload.message.providerStatus.replaceAll("_", " ")}.`
          : `Message sent to ${tutor.name} in Studacad.`,
      );
      await refreshMessages();
    } catch (error) {
      setMessageError(true);
      setMessageNotice(
        error instanceof Error
          ? error.message
          : "The message could not be sent.",
      );
    } finally {
      setMessageSending(false);
    }
  };

  return (
    <main className="lms-page tutor-profile-page">
      <LmsHeader />
      <div className="profile-shell">
        <div className="profile-main">
          <Link className="profile-back" href="/tutors">
            ← Back to tutors
          </Link>

          <section className="profile-intro">
            <div className={`profile-photo ${tutor.color}`}>
              <img
                src={tutor.image}
                alt={`${tutor.name}, ${tutor.examination} ${tutor.subject} tutor`}
                width={900}
                height={900}
                decoding="async"
              />
              <span>Approved tutor</span>
            </div>
            <div className="profile-summary">
              <p className="eyebrow">
                {tutor.examination} · {tutor.subject}
              </p>
              <h1>
                {tutor.name} <i>✓</i>
              </h1>
              <p className="profile-headline">{tutor.headline}</p>
              <div className="profile-facts">
                <span>
                  <b>★ {tutor.rating}</b> tutor rating
                </span>
                <span>
                  <b>{tutor.lessons}</b> completed
                </span>
                <span>
                  <b>{tutor.experience}</b>
                </span>
                <span>
                  <b>{tutor.location}</b>
                </span>
              </div>
            </div>
          </section>

          <div className="profile-actions" aria-label="Tutor profile actions">
            <button
              type="button"
              aria-label={`Message ${tutor.name}`}
              title={`Message ${tutor.name}`}
              onClick={() => {
                setMessageOpen(true);
                setMessageNotice("");
                setMessageError(false);
                void refreshMessages();
              }}
            >
              <MessageIcon />
              <span className="sr-only">Message {tutor.name}</span>
            </button>
            <button
              type="button"
              aria-label={
                isFavourite ? "Remove from favourites" : "Add to favourites"
              }
              title={
                isFavourite ? "Remove from favourites" : "Add to favourites"
              }
              className={isFavourite ? "active" : ""}
              onClick={() => void handleFavourite()}
              disabled={!favouritesReady}
            >
              <HeartIcon filled={isFavourite} />
              <span className="sr-only">
                {isFavourite ? "Saved to favourites" : "Add to favourites"}
              </span>
            </button>
            <button
              type="button"
              aria-label="Share profile"
              title="Share profile"
              onClick={shareTutor}
            >
              <ShareIcon />
              <span className="sr-only">Share profile</span>
            </button>
            <button
              type="button"
              aria-label={`Report ${tutor.name}`}
              title={`Report ${tutor.name}`}
              onClick={() => void reportTutorConcern()}
            >
              <span aria-hidden="true">⚑</span>
              <span className="sr-only">Report {tutor.name}</span>
            </button>
          </div>
          {actionNotice && (
            <p className="profile-action-notice" role="status">
              {actionNotice}{" "}
              {isFavourite && <Link href="/favourites">View favourites →</Link>}
            </p>
          )}

          <section className="profile-section">
            <p className="eyebrow">Meet your tutor</p>
            <h2>About {tutor.name}</h2>
            <p>{tutor.about}</p>
            <div className="specialty-list">
              {tutor.specialties.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          {tutor.introVideo && (
            <section className="profile-section video-profile-section">
              <p className="eyebrow">Tutor introduction</p>
              <h2>Meet {tutor.name} on video</h2>
              <div className="tutor-video-layout">
                <video
                  controls
                  preload="metadata"
                  poster={tutor.image}
                  aria-label={`${tutor.name}'s introductory video`}
                  width={1280}
                  height={720}
                >
                  <source src={tutor.introVideo} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
                <div>
                  <span className="video-duration">
                    ▶ 1 minute introduction
                  </span>
                  <h3>Teaching style and lesson expectations</h3>
                  <p>
                    Hear how {tutor.name} supports {tutor.examination} learners,
                    structures tutorials, and helps students prepare for{" "}
                    {tutor.subject} examinations.
                  </p>
                </div>
              </div>
            </section>
          )}

          {(tutor.resume.education.length > 0 ||
            tutor.resume.experience.length > 0 ||
            tutor.resume.certifications.length > 0) && (
            <section className="profile-section">
              <p className="eyebrow">Qualifications and experience</p>
              <h2>{tutor.name}&apos;s résumé</h2>
              <div className="resume-simple">
                <div>
                  <h3>Education</h3>
                  <div>
                    {tutor.resume.education.map((item) => (
                      <p className="resume-education" key={item}>
                        <span>{item}</span>
                        <em>
                          <i>✓</i> Verified
                        </em>
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Experience</h3>
                  <div>
                    {tutor.resume.experience.map((item) => (
                      <p
                        className="resume-role"
                        key={`${item.role}-${item.period}`}
                      >
                        <strong>{item.role}</strong>
                        <span>
                          {item.organisation} · {item.period}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Credentials</h3>
                  <ul>
                    {tutor.resume.certifications.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {tutor.approach.length > 0 && (
            <section className="profile-section">
              <p className="eyebrow">A complete Studacad lesson</p>
              <h2>What learning together looks like</h2>
              <div className="approach-grid">
                {tutor.approach.map((item, index) => (
                  <div key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="booking-card">
          <p className="eyebrow">Choose how to learn</p>
          <div className="booking-price">
            <strong>{sessionPrice}</strong>
            <span>
              credits
              <br />
              per available lesson
            </span>
          </div>
          <div className="booking-balance">
            <span>Your wallet</span>
            <b>{credits.toLocaleString()} credits</b>
          </div>
          <button
            className="message-before-booking"
            type="button"
            onClick={() => {
              setMessageOpen(true);
              setMessageNotice("");
              setMessageError(false);
              void refreshMessages();
            }}
          >
            <MessageIcon /> Message before booking
          </button>
          <fieldset className="session-format-fieldset">
            <legend>Session format</legend>
            {availableSessions.map((option) => (
              <label
                key={option.id}
                className={selectedFormat === option.id ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="session-format"
                  checked={selectedFormat === option.id}
                  onChange={() => {
                    setSelectedFormat(option.id);
                    setScheduleMode(
                      option.id === "online-group" ? "group" : "private",
                    );
                    setSelectedLessonSlots({ private: [], group: [] });
                    setNotice("");
                    setBooked(false);
                  }}
                />
                <span className="session-format-copy">
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </fieldset>
          {isOnlineSession && (
            <div className="session-venue google-meet-venue">
              <span>G</span>
              <div>
                <strong>Google Meet included</strong>
                <small>A secure meeting space is prepared after booking.</small>
              </div>
            </div>
          )}
          {selectedFormat === "tutor-place" && (
            <div className="session-venue">
              <span>⌂</span>
              <div>
                <strong>{tutor.location}</strong>
                <small>The exact address is shared after confirmation.</small>
              </div>
            </div>
          )}
          {selectedFormat === "student-place" && (
            <label className="student-address">
              <span>Learner&apos;s address</span>
              <input
                value={studentAddress}
                onChange={(event) => {
                  setStudentAddress(event.target.value);
                  setNotice("");
                }}
                placeholder="Street and area"
              />
            </label>
          )}
          <div className="schedule-picker-summary">
            <div>
              <span>Weekly schedule</span>
              <strong>
                {activeLessonSlots.length > 0
                  ? `${activeScheduleMode} lesson selected`
                  : "Choose a server-confirmed time"}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setScheduleMode(activeScheduleMode);
                setScheduleOpen(true);
              }}
            >
              Choose time
            </button>
            {activeLessonSlots.length > 0 && (
              <div className="selected-slot-chips">
                {activeLessonSlots.map((slot) => (
                  <span key={slot}>{displaySlot(slot)}</span>
                ))}
              </div>
            )}
          </div>
          {!booked ? (
            <div className="booking-actions">
              <button
                className="primary booking-button"
                onClick={() => void confirmBooking()}
                disabled={
                  bookingLoading ||
                  activeLessonSlots.length === 0 ||
                  credits < bookingTotal
                }
              >
                {bookingLoading
                  ? "Confirming securely…"
                  : activeLessonSlots.length === 0
                    ? "Choose a lesson time"
                    : credits < bookingTotal
                      ? "Add credits to book"
                      : `Book ${session.label} · ${bookingTotal} credits`}
              </button>
            </div>
          ) : (
            <div className="booking-success">
              <span>✓</span>
              <div>
                <strong>{bookedLabel || session.label} booked</strong>
                <p>{bookedDuration}</p>
                {bookedSlots.length > 0 && (
                  <ul className="booked-slot-list">
                    {bookedSlots.map((slot) => (
                      <li key={slot}>{displaySlot(slot)}</li>
                    ))}
                  </ul>
                )}
                <small>
                  {isOnlineSession
                    ? "Meeting details appear in Bookings and are released 24 hours before the lesson starts."
                    : selectedFormat === "student-place"
                      ? studentAddress
                      : "Venue details will be shared in your messages."}
                </small>
                <Link href="/bookings">View your bookings →</Link>
              </div>
            </div>
          )}
          {notice && (
            <p
              className={booked ? "booking-notice success" : "booking-notice"}
              role="status"
            >
              {notice}
            </p>
          )}
          {activeLessonSlots.length > 0 && credits < bookingTotal && (
            <Link className="booking-topup" href="/wallet">
              View your Studacad wallet →
            </Link>
          )}
          <small>
            The selected server price is held immediately when the booking is
            confirmed. The tutor cannot be double-booked.
          </small>
        </aside>
      </div>

      {scheduleOpen && (
        <div
          className="schedule-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSchedule();
          }}
        >
          <section
            ref={scheduleDialogRef}
            className="weekly-schedule-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-heading"
          >
            <header>
              <div>
                <p className="eyebrow">{tutor.name}&apos;s availability</p>
                <h2 id="schedule-heading">Weekly schedule</h2>
              </div>
              <button
                type="button"
                aria-label="Close weekly schedule"
                onClick={closeSchedule}
              >
                ×
              </button>
            </header>
            <div className="schedule-timezone-note">
              <span>i</span>
              <p>
                Choose one valid lesson time. Times are displayed in your local
                timezone and rechecked by the server before credits are held.
              </p>
            </div>
            <div className="schedule-type-tabs">
              <button type="button" className="active" disabled>
                {session.label}
                <small>{sessionPrice} credits for the selected time</small>
              </button>
            </div>
            <div className="schedule-week-controls">
              <div>
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={() => changeWeek(-1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next week"
                  onClick={() => changeWeek(1)}
                >
                  ›
                </button>
                <strong>
                  {weekDays[0].toLocaleDateString("en-BW", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  –{" "}
                  {weekDays[6].toLocaleDateString("en-BW", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </div>
              <div className="schedule-timezone">
                <strong>
                  {Intl.DateTimeFormat().resolvedOptions().timeZone ||
                    "Africa/Gaborone"}
                </strong>
                <small>Local display timezone</small>
              </div>
            </div>
            {slotsError && (
              <p className="booking-notice" role="alert">
                {slotsError}
              </p>
            )}
            <div className="weekly-schedule-grid">
              {weekDays.map((date) => {
                const slots = availableSlots.filter(
                  (slot) => dateKey(new Date(slot.startsAt)) === dateKey(date),
                );
                const past = dateKey(date) < dateKey(new Date());
                return (
                  <div
                    className={past ? "schedule-day past" : "schedule-day"}
                    key={dateKey(date)}
                  >
                    <div className="schedule-day-heading">
                      <span>
                        {date.toLocaleDateString("en-BW", { weekday: "short" })}
                      </span>
                      <strong>{date.getDate()}</strong>
                    </div>
                    <div className="schedule-day-slots">
                      {slotsLoading ? (
                        <small>…</small>
                      ) : slots.length === 0 ? (
                        <small>—</small>
                      ) : (
                        slots.map((slot) => {
                          const selected = selectedLessonSlots[
                            scheduleMode
                          ].includes(slot.startsAt);
                          return (
                            <button
                              type="button"
                              key={slot.startsAt}
                              className={selected ? "selected" : ""}
                              aria-pressed={selected}
                              disabled={past || slot.remainingCapacity < 1}
                              onClick={() =>
                                toggleScheduleSlot(scheduleMode, slot.startsAt)
                              }
                            >
                              {new Date(slot.startsAt).toLocaleTimeString(
                                "en-BW",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                              {slot.capacity > 1
                                ? ` · ${slot.remainingCapacity} left`
                                : ""}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <footer>
              <div>
                <strong>
                  {selectedLessonSlots[scheduleMode].length} selected
                </strong>
                <span>
                  {scheduleMode === "group"
                    ? "Online group lesson"
                    : "Private lesson time"}
                </span>
              </div>
              <button
                className="primary"
                type="button"
                onClick={closeSchedule}
                disabled={selectedLessonSlots[scheduleMode].length === 0}
              >
                Use selected time
              </button>
            </footer>
          </section>
        </div>
      )}

      {messageOpen && (
        <div
          className="message-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMessage();
          }}
        >
          <section
            ref={messageDialogRef}
            className="message-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-heading"
          >
            <button
              className="message-close"
              type="button"
              aria-label="Close message window"
              onClick={closeMessage}
            >
              ×
            </button>
            <div className="message-tutor">
              <img
                src={tutor.image}
                alt=""
                width={160}
                height={160}
                decoding="async"
              />
              <div>
                <p className="eyebrow">Message before booking</p>
                <h2 id="message-heading">Ask {tutor.name} a question</h2>
              </div>
            </div>
            <div className="message-channel">
              <span>
                <WhatsAppIcon /> Studacad messaging
              </span>
              <Link href="/messages">Open all messages</Link>
            </div>
            <p className="message-helper">
              Share the learner&apos;s level, topic, and suitable times. The
              message stays in Studacad. When this tutor has a verified WhatsApp
              channel, its delivery state appears alongside the in-app message.
            </p>
            {messageLoadError && (
              <p className="message-status" role="alert">
                {messageLoadError}{" "}
                <button type="button" onClick={() => void refreshMessages()}>
                  Try again
                </button>
              </p>
            )}
            {messageHistory.length > 0 && (
              <div
                className="message-thread"
                aria-label={`Conversation with ${tutor.name}`}
              >
                {messageHistory.map((message) => (
                  <div
                    className={`thread-message ${message.direction}`}
                    key={message.id}
                  >
                    <p>{message.text}</p>
                    <small>
                      {message.direction === "inbound" ? tutor.name : "You"} ·{" "}
                      {new Date(message.createdAt).toLocaleString()} ·{" "}
                      {message.status}
                    </small>
                  </div>
                ))}
              </div>
            )}
            <label htmlFor="tutor-message">Your message</label>
            <textarea
              id="tutor-message"
              value={messageText}
              onChange={(event) => {
                setMessageText(event.target.value);
                setMessageNotice("");
              }}
              placeholder={`Hello ${tutor.name}, I would like help with…`}
              rows={6}
            />
            {messageNotice && (
              <p
                className={
                  messageError ? "message-status" : "message-status success"
                }
                role="status"
              >
                {messageNotice}
              </p>
            )}
            <div className="message-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={closeMessage}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary whatsapp-send"
                onClick={() => void sendMessage()}
                disabled={messageSending}
              >
                {messageSending ? "Sending…" : "Send message"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
