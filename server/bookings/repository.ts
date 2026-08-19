import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { ExamLevel, Json, SessionFormat } from "../db/models";
import type { Viewer } from "../auth/viewer";

export type AvailableSlot = Readonly<{
  startsAt: string;
  endsAt: string;
  timezone: string;
  format: SessionFormat;
  examination: ExamLevel;
  subject: string;
  priceCredits: number;
  capacity: number;
  remainingCapacity: number;
}>;

export class BookingError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = "BookingError"; }
}

const databaseMessage = (error: { message?: string } | null, fallback: string) => {
  const message = error?.message ?? "";
  const safe = [
    "The selected slot is no longer available", "Insufficient credits", "The selected group is full",
    "Learner is already booked into this slot", "Bookings cannot be cancelled after the lesson starts",
    "You cannot cancel this booking", "Booking not found", "Only an active approved tutor may manage availability",
    "Every rule must use an approved session format", "Only the booked tutor may record this outcome",
    "The lesson outcome cannot be recorded yet", "Only an active booking participant may raise a dispute",
    "This booking is outside the dispute window", "Unsupported booking outcome",
    "Learner already has an overlapping active booking", "Idempotency key was already used for a different booking"
  ].find(candidate => message.includes(candidate));
  if (safe) return new BookingError(safe, safe === "Booking not found" ? 404 : safe.includes("cannot") || safe.includes("Only") ? 403 : 409);
  return new BookingError(fallback, 500);
};

export async function listAvailableSlots(input: {
  tutorSlug: string;
  from: Date;
  to: Date;
  format: SessionFormat;
  examination: ExamLevel;
  subject: string;
}): Promise<AvailableSlot[]> {
  const { data, error } = await getDatabaseAdminClient().rpc("list_tutor_slots", {
    p_tutor_slug: input.tutorSlug,
    p_from: input.from.toISOString(),
    p_to: input.to.toISOString(),
    p_format: input.format,
    p_examination: input.examination,
    p_subject: input.subject
  });
  if (error) throw databaseMessage(error, "Unable to load tutor availability.");
  return data.map(slot => ({
    startsAt: slot.starts_at,
    endsAt: slot.ends_at,
    timezone: slot.timezone,
    format: slot.format,
    examination: slot.examination,
    subject: slot.subject,
    priceCredits: slot.price_credits,
    capacity: slot.capacity,
    remainingCapacity: slot.remaining_capacity
  }));
}

export async function getOwnAvailability(userId: string) {
  const database = getDatabaseAdminClient();
  const profile = await database.from("tutor_profiles").select("*").eq("tutor_user_id", userId).eq("status", "active").maybeSingle();
  if (profile.error) throw databaseMessage(profile.error, "Unable to load the tutor profile.");
  if (!profile.data) throw new BookingError("An approved active tutor profile is required.", 403);
  const [rules, exceptions] = await Promise.all([
    database.from("availability_rules").select("*").eq("tutor_profile_id", profile.data.id).order("weekday"),
    database.from("availability_exceptions").select("*").eq("tutor_profile_id", profile.data.id).gte("ends_at", new Date().toISOString()).order("starts_at")
  ]);
  if (rules.error || exceptions.error) throw databaseMessage(rules.error ?? exceptions.error, "Unable to load availability.");
  const [subjects, formats] = await Promise.all([
    database.from("tutor_profile_subjects").select("*").eq("tutor_profile_id", profile.data.id).order("examination"),
    database.from("tutor_profile_formats").select("*").eq("tutor_profile_id", profile.data.id).order("format")
  ]);
  if (subjects.error || formats.error) throw databaseMessage(subjects.error ?? formats.error, "Unable to load tutor settings.");
  return {
    profile: { id: profile.data.id, slug: profile.data.slug, timezone: profile.data.timezone },
    rules: rules.data.map(rule => ({
      id: rule.id, weekday: rule.weekday, localStartTime: rule.local_start_time.slice(0, 5), localEndTime: rule.local_end_time.slice(0, 5),
      timezone: rule.timezone, format: rule.format, slotDurationMinutes: rule.slot_duration_minutes,
      leadTimeMinutes: rule.lead_time_minutes, bufferBeforeMinutes: rule.buffer_before_minutes,
      bufferAfterMinutes: rule.buffer_after_minutes, effectiveFrom: rule.effective_from, effectiveUntil: rule.effective_until
    })),
    exceptions: exceptions.data.map(exception => ({ id: exception.id, startsAt: exception.starts_at, endsAt: exception.ends_at, available: exception.available, reason: exception.reason ?? "" })),
    settings: {
      subjects: subjects.data.map(subject => ({ examination: subject.examination, subject: subject.subject, priceCredits: subject.price_credits })),
      formats: formats.data.map(format => ({ format: format.format, groupCapacity: format.group_capacity, locationNote: format.location_note ?? "" }))
    }
  };
}

export async function replaceOwnAvailability(userId: string, rules: Json[], exceptions: Json[], settings: Json) {
  const { data, error } = await getDatabaseAdminClient().rpc("replace_tutor_availability", {
    p_actor_user_id: userId,
    p_rules: rules,
    p_exceptions: exceptions,
    p_settings: settings
  });
  if (error) throw databaseMessage(error, "Unable to save tutor availability.");
  return data;
}

export async function createConfirmedBooking(input: {
  learnerUserId: string;
  tutorSlug: string;
  format: SessionFormat;
  examination: ExamLevel;
  subject: string;
  startsAt: Date;
  displayTimezone: string;
  learnerLocation: string | null;
  idempotencyKey: string;
}) {
  const { data, error } = await getDatabaseAdminClient().rpc("create_confirmed_booking", {
    p_learner_user_id: input.learnerUserId,
    p_tutor_slug: input.tutorSlug,
    p_format: input.format,
    p_examination: input.examination,
    p_subject: input.subject,
    p_starts_at: input.startsAt.toISOString(),
    p_display_timezone: input.displayTimezone,
    p_learner_location: input.learnerLocation,
    p_idempotency_key: input.idempotencyKey
  });
  if (error) throw databaseMessage(error, "Unable to create the booking.");
  return data;
}

export async function cancelBooking(input: { actorUserId: string; bookingId: string; reason: string; idempotencyKey: string }) {
  const { data, error } = await getDatabaseAdminClient().rpc("cancel_booking_with_refund", {
    p_actor_user_id: input.actorUserId,
    p_booking_id: input.bookingId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey
  });
  if (error) throw databaseMessage(error, "Unable to cancel the booking.");
  return data;
}

export async function recordBookingOutcome(input: { actorUserId: string; bookingId: string; targetStatus: "completed" | "no_show" | "disputed"; reason: string; idempotencyKey: string }) {
  const { data, error } = await getDatabaseAdminClient().rpc("record_booking_outcome", {
    p_actor_user_id: input.actorUserId, p_booking_id: input.bookingId,
    p_target_status: input.targetStatus, p_reason: input.reason, p_idempotency_key: input.idempotencyKey
  });
  if (error) throw databaseMessage(error, "Unable to update the booking outcome.");
  return data;
}

export async function listBookingsForViewer(viewer: Viewer) {
  const database = getDatabaseAdminClient();
  const ownParticipants = await database.from("booking_participants").select("*").eq("learner_user_id", viewer.id);
  if (ownParticipants.error) throw databaseMessage(ownParticipants.error, "Unable to load bookings.");
  const ownParticipantMap = new Map(ownParticipants.data.map(participant => [participant.booking_id, participant]));
  const bookingIds = new Set(ownParticipants.data.map(participant => participant.booking_id));

  let tutorProfileId: string | null = null;
  if (viewer.roles.includes("tutor")) {
    const profile = await database.from("tutor_profiles").select("*").eq("tutor_user_id", viewer.id).maybeSingle();
    if (profile.error) throw databaseMessage(profile.error, "Unable to load tutor bookings.");
    tutorProfileId = profile.data?.id ?? null;
    if (tutorProfileId) {
      const tutorBookings = await database.from("bookings").select("*").eq("tutor_profile_id", tutorProfileId);
      if (tutorBookings.error) throw databaseMessage(tutorBookings.error, "Unable to load tutor bookings.");
      tutorBookings.data.forEach(booking => bookingIds.add(booking.id));
    }
  }
  if (!bookingIds.size) return [];
  const bookings = await database.from("bookings").select("*").in("id", [...bookingIds]).order("starts_at", { ascending: true });
  if (bookings.error) throw databaseMessage(bookings.error, "Unable to load bookings.");
  const profileIds = [...new Set(bookings.data.map(booking => booking.tutor_profile_id))];
  const profiles = await database.from("tutor_profiles").select("*").in("id", profileIds);
  if (profiles.error) throw databaseMessage(profiles.error, "Unable to load booking tutors.");
  const tutorUserIds = [...new Set(profiles.data.map(profile => profile.tutor_user_id))];
  const accounts = await database.from("user_accounts").select("*").in("id", tutorUserIds);
  if (accounts.error) throw databaseMessage(accounts.error, "Unable to load booking tutors.");
  const profilesById = new Map(profiles.data.map(profile => [profile.id, profile]));
  const accountsById = new Map(accounts.data.map(account => [account.id, account]));
  const allParticipants = await database.from("booking_participants").select("*").in("booking_id", [...bookingIds]);
  if (allParticipants.error) throw databaseMessage(allParticipants.error, "Unable to load booking participants.");
  const locations = await database.from("booking_location_details").select("*").in("booking_id", [...bookingIds]);
  if (locations.error) throw databaseMessage(locations.error, "Unable to load booking locations.");
  const locationsByBooking = new Map(locations.data.map(location => [location.booking_id, location]));

  return bookings.data.map(booking => {
    const profile = profilesById.get(booking.tutor_profile_id);
    const tutor = profile ? accountsById.get(profile.tutor_user_id) : null;
    const participant = ownParticipantMap.get(booking.id);
    const isTutor = booking.tutor_profile_id === tutorProfileId;
    const viewerStatus = participant?.cancelled_at ? "cancelled_by_learner" : booking.status;
    const activeParticipants = allParticipants.data.filter(item => item.booking_id === booking.id && !item.cancelled_at).length;
    const location = locationsByBooking.get(booking.id);
    const now = Date.now();
    const startsAt = new Date(booking.starts_at).getTime();
    const endsAt = new Date(booking.ends_at).getTime();
    const availableActions: string[] = [];
    if (isTutor && booking.status === "confirmed" && now >= endsAt) availableActions.push("completed", "no_show");
    if (!isTutor && participant && !participant.cancelled_at && ["confirmed", "completed", "no_show"].includes(booking.status) && now >= startsAt && now <= endsAt + 7 * 86_400_000) availableActions.push("disputed");
    return {
      id: booking.id, tutorName: tutor?.display_name ?? "Studacad tutor", tutorSlug: profile?.slug ?? "",
      format: booking.format, examination: booking.examination, subject: booking.subject,
      startsAt: booking.starts_at, endsAt: booking.ends_at, timezone: booking.timezone,
      priceCredits: booking.price_per_learner_credits, capacity: booking.capacity, activeParticipants,
      locationNote: location?.learner_address ?? location?.tutor_location_note ?? null,
      status: viewerStatus, perspective: isTutor ? "tutor" : "learner",
      canCancel: startsAt > now
        && ["pending", "held", "confirmed"].includes(booking.status)
        && (isTutor || Boolean(participant && !participant.cancelled_at)),
      availableActions
    };
  });
}

export function bookingErrorResponse(error: unknown): Response {
  if (error instanceof BookingError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } });
  throw error;
}
