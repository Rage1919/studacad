export type IsoTimestamp = string;
export type Uuid = string;

export type AccountStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "deletion_requested"
  | "deleted";
export type AppRole = "learner" | "tutor" | "admin";
export type ExamLevel = "PSLE" | "JCE" | "BGCSE";
export type SessionFormat =
  "online_1to1" | "online_group" | "tutor_place" | "student_place";
export type TutorApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "suspended"
  | "withdrawn";
export type TutorProfileStatus =
  "draft" | "pending_review" | "active" | "suspended" | "archived";
export type BookingStatus =
  | "pending"
  | "held"
  | "confirmed"
  | "cancelled_by_learner"
  | "cancelled_by_tutor"
  | "completed"
  | "no_show"
  | "disputed"
  | "expired"
  | "refunded";
export type CourseStatus = "draft" | "published" | "archived";
export type PaymentStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "partially_refunded"
  | "refunded"
  | "disputed";
export type LedgerTransactionKind =
  | "topup"
  | "purchase"
  | "reward"
  | "refund"
  | "adjustment"
  | "hold"
  | "release"
  | "chargeback"
  | "earning"
  | "payout";

export type UserAccount = {
  id: Uuid;
  auth_subject: Uuid;
  email: string;
  display_name: string;
  phone_e164: string | null;
  timezone: string;
  status: AccountStatus;
  email_verified_at: IsoTimestamp | null;
  export_requested_at: IsoTimestamp | null;
  deletion_requested_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  deleted_at: IsoTimestamp | null;
};

export type ObjectFile = {
  id: Uuid;
  owner_user_id: Uuid;
  kind:
    | "tutor_identity"
    | "tutor_qualification"
    | "learning_resource"
    | "message_attachment"
    | "profile_image";
  bucket: "studacad-private";
  object_key: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  scan_status: "pending" | "clean" | "rejected" | "failed";
  scan_provider_reference: string | null;
  retention_until: IsoTimestamp | null;
  created_at: IsoTimestamp;
  deleted_at: IsoTimestamp | null;
};

export type TutorApplication = {
  id: Uuid;
  applicant_user_id: Uuid;
  parent_application_id: Uuid | null;
  status: TutorApplicationStatus;
  version: number;
  legal_name: string | null;
  phone_e164: string | null;
  district: string | null;
  headline: string | null;
  biography: string | null;
  location: string | null;
  timezone: string;
  teaching_experience: string | null;
  languages: string[];
  base_price_credits: number | null;
  session_duration_minutes: number | null;
  availability: Json;
  consented_at: IsoTimestamp | null;
  submitted_at: IsoTimestamp | null;
  reviewed_at: IsoTimestamp | null;
  withdrawn_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type TutorApplicationSubject = {
  application_id: Uuid;
  examination: ExamLevel;
  subject: string;
};

export type TutorApplicationFormat = {
  application_id: Uuid;
  format: SessionFormat;
};

export type TutorQualification = {
  id: Uuid;
  application_id: Uuid;
  qualification_type: string;
  institution: string;
  title: string;
  awarded_on: string | null;
  expires_on: string | null;
  created_at: IsoTimestamp;
};

export type TutorApplicationDocument = {
  application_id: Uuid;
  file_id: Uuid;
  document_type: string;
  created_at: IsoTimestamp;
};

export type TutorApplicationReview = {
  id: Uuid;
  application_id: Uuid;
  reviewer_user_id: Uuid;
  from_status: TutorApplicationStatus;
  to_status: TutorApplicationStatus;
  internal_note: string | null;
  applicant_message: string | null;
  created_at: IsoTimestamp;
};

export type PublicTutorMarketplaceProfile = {
  id: Uuid;
  slug: string;
  display_name: string;
  headline: string;
  about: string;
  location: string;
  timezone: string;
  base_price_credits: number;
  average_rating: number;
  completed_booking_count: number;
  published_at: IsoTimestamp;
  teaching_experience: string | null;
  languages: string[];
  profile_image_object_key: string;
  profile_image_content_type: string;
  subjects: Json;
  formats: Json;
};

export type TutorProfile = {
  id: Uuid;
  tutor_user_id: Uuid;
  approved_application_id: Uuid;
  status: TutorProfileStatus;
  slug: string;
  headline: string;
  about: string;
  location: string;
  timezone: string;
  base_price_credits: number;
  profile_image_file_id: Uuid | null;
  average_rating: number;
  completed_booking_count: number;
  published_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type TutorProfileSubject = {
  tutor_profile_id: Uuid;
  examination: ExamLevel;
  subject: string;
  price_credits: number;
};

export type TutorProfileFormat = {
  tutor_profile_id: Uuid;
  format: SessionFormat;
  location_note: string | null;
  group_capacity: number;
};

export type Booking = {
  id: Uuid;
  tutor_profile_id: Uuid;
  created_by_user_id: Uuid;
  format: SessionFormat;
  examination: ExamLevel;
  subject: string;
  starts_at: IsoTimestamp;
  ends_at: IsoTimestamp;
  timezone: string;
  capacity: number;
  price_per_learner_credits: number;
  status: BookingStatus;
  idempotency_key: string;
  cancellation_reason: string | null;
  cancelled_at: IsoTimestamp | null;
  completed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  slot: string;
};

export type AvailabilityRule = {
  id: Uuid;
  tutor_profile_id: Uuid;
  weekday: number;
  local_start_time: string;
  local_end_time: string;
  timezone: string;
  format: SessionFormat;
  slot_duration_minutes: number;
  lead_time_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  effective_from: string;
  effective_until: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type AvailabilityException = {
  id: Uuid;
  tutor_profile_id: Uuid;
  starts_at: IsoTimestamp;
  ends_at: IsoTimestamp;
  available: boolean;
  reason: string | null;
  created_at: IsoTimestamp;
};

export type BookingParticipant = {
  booking_id: Uuid;
  learner_user_id: Uuid;
  joined_at: IsoTimestamp;
  cancelled_at: IsoTimestamp | null;
};

export type BookingMeeting = {
  booking_id: Uuid;
  provider: "google_meet";
  status:
    | "pending"
    | "provisioning"
    | "ready"
    | "retry_required"
    | "support_required"
    | "revoked";
  provider_space_name: string | null;
  meeting_uri: string | null;
  creator_user_id: Uuid;
  provider_creator: string | null;
  attempt_count: number;
  last_error_code: string | null;
  next_retry_at: IsoTimestamp | null;
  requested_at: IsoTimestamp;
  provisioned_at: IsoTimestamp | null;
  revoked_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type BookingLocationDetail = {
  booking_id: Uuid;
  learner_address: string | null;
  tutor_location_note: string | null;
  created_at: IsoTimestamp;
};

export type Course = {
  id: Uuid;
  slug: string;
  title: string;
  examination: ExamLevel;
  subject: string;
  description: string;
  instructor_tutor_profile_id: Uuid | null;
  price_credits: number;
  theme_color: string;
  status: CourseStatus;
  published_at: IsoTimestamp | null;
  created_by_user_id: Uuid;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type LessonRecord = {
  id: Uuid;
  course_id: Uuid;
  slug: string;
  title: string;
  description: string;
  duration_minutes: number;
  position: number;
  video_url: string | null;
  revision_title: string | null;
  revision_content: string | null;
  status: CourseStatus;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type QuizQuestionRecord = {
  id: Uuid;
  lesson_id: Uuid;
  prompt: string;
  position: number;
  points: number;
  created_at: IsoTimestamp;
};
export type QuizOptionRecord = {
  id: Uuid;
  question_id: Uuid;
  label: string;
  position: number;
  is_correct: boolean;
};
export type CoursePurchaseRecord = {
  id: Uuid;
  learner_user_id: Uuid;
  course_id: Uuid;
  status: "pending" | "completed" | "refunded" | "cancelled";
  price_credits: number;
  idempotency_key: string;
  purchased_at: IsoTimestamp | null;
  refunded_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
};
export type LessonProgressRecord = {
  learner_user_id: Uuid;
  lesson_id: Uuid;
  status: "not_started" | "in_progress" | "completed";
  best_score_percent: number | null;
  started_at: IsoTimestamp | null;
  completed_at: IsoTimestamp | null;
  updated_at: IsoTimestamp;
};
export type QuizAttemptRecord = {
  id: Uuid;
  learner_user_id: Uuid;
  lesson_id: Uuid;
  score_points: number;
  possible_points: number;
  passed: boolean;
  idempotency_key: string;
  submitted_at: IsoTimestamp;
};
export type QuizAttemptAnswerRecord = {
  attempt_id: Uuid;
  question_id: Uuid;
  selected_option_id: Uuid;
  awarded_points: number;
};
export type TutorFavouriteRecord = {
  learner_user_id: Uuid;
  tutor_profile_id: Uuid;
  created_at: IsoTimestamp;
};
export type ReferralCodeRecord = {
  id: Uuid;
  owner_user_id: Uuid;
  code: string;
  created_at: IsoTimestamp;
  disabled_at: IsoTimestamp | null;
};
export type ReferralAttributionRecord = {
  id: Uuid;
  referral_code_id: Uuid;
  referred_user_id: Uuid;
  attributed_at: IsoTimestamp;
};
export type ReferralRewardRecord = {
  id: Uuid;
  attribution_id: Uuid;
  qualifying_booking_id: Uuid;
  credits: number;
  status: "pending" | "earned" | "reversed";
  ledger_transaction_id: Uuid | null;
  created_at: IsoTimestamp;
  earned_at: IsoTimestamp | null;
  reversed_at: IsoTimestamp | null;
};

export type Conversation = {
  id: Uuid;
  kind: "booking" | "support";
  booking_id: Uuid | null;
  tutor_profile_id: Uuid | null;
  created_by_user_id: Uuid | null;
  subject: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ConversationParticipant = {
  conversation_id: Uuid;
  user_id: Uuid;
  last_read_at: IsoTimestamp | null;
  joined_at: IsoTimestamp;
  left_at: IsoTimestamp | null;
};

export type Message = {
  id: Uuid;
  conversation_id: Uuid;
  sender_user_id: Uuid;
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  channel: "in_app" | "whatsapp";
  direction: "internal" | "outbound" | "inbound";
  moderation_status: "visible" | "reported" | "removed";
  client_idempotency_key: string;
  provider_message_id: string | null;
  created_at: IsoTimestamp;
  edited_at: IsoTimestamp | null;
  deleted_at: IsoTimestamp | null;
};

export type TutorMessagingChannel = {
  id: Uuid;
  tutor_profile_id: Uuid;
  provider: "whatsapp";
  recipient_e164: string;
  status: "pending" | "verified" | "disabled";
  verified_by_user_id: Uuid | null;
  verified_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};
export type MessageDelivery = {
  id: Uuid;
  message_id: Uuid;
  channel_id: Uuid;
  provider: "whatsapp";
  status:
    | "queued"
    | "sending"
    | "sent"
    | "delivered"
    | "read"
    | "retry_required"
    | "failed"
    | "support_required";
  provider_message_id: string | null;
  attempt_count: number;
  last_error_code: string | null;
  next_retry_at: IsoTimestamp | null;
  sent_at: IsoTimestamp | null;
  delivered_at: IsoTimestamp | null;
  read_at: IsoTimestamp | null;
  failed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};
export type ContactBlock = {
  blocker_user_id: Uuid;
  blocked_user_id: Uuid;
  conversation_id: Uuid;
  reason: string | null;
  created_at: IsoTimestamp;
};
export type MessageReport = {
  id: Uuid;
  message_id: Uuid;
  conversation_id: Uuid;
  reporter_user_id: Uuid;
  reason: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  reviewed_by_user_id: Uuid | null;
  reviewed_at: IsoTimestamp | null;
  resolution_note: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type WalletBalance = {
  wallet_account_id: Uuid;
  balance_credits: number;
};

export type WalletAccount = {
  id: Uuid;
  owner_user_id: Uuid | null;
  system_code: string | null;
  created_at: IsoTimestamp;
  closed_at: IsoTimestamp | null;
};

export type LedgerTransaction = {
  id: Uuid;
  kind: LedgerTransactionKind;
  idempotency_key: string;
  description: string;
  booking_id: Uuid | null;
  course_purchase_id: Uuid | null;
  actor_user_id: Uuid | null;
  metadata: Json;
  created_at: IsoTimestamp;
};

export type LedgerEntry = {
  id: Uuid;
  transaction_id: Uuid;
  wallet_account_id: Uuid;
  amount_credits: number;
  created_at: IsoTimestamp;
};

export type ProviderWebhookEvent = {
  id: Uuid;
  provider: string;
  provider_event_id: string;
  event_type: string;
  payload_sha256: string;
  status: "received" | "processed" | "ignored" | "failed";
  failure_reason: string | null;
  received_at: IsoTimestamp;
  processed_at: IsoTimestamp | null;
};

export type TutorEarning = {
  id: Uuid;
  tutor_user_id: Uuid;
  booking_id: Uuid;
  gross_credits: number;
  platform_fee_credits: number;
  net_credits: number;
  refunded_credits: number;
  status: "pending" | "available" | "held" | "paid" | "reversed";
  available_at: IsoTimestamp | null;
  ledger_transaction_id: Uuid | null;
  released_gross_credits: number | null;
  released_platform_fee_credits: number | null;
  released_net_credits: number | null;
  released_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type TutorPayoutDestination = {
  id: Uuid;
  tutor_user_id: Uuid;
  provider: "manual_bank" | "manual_mobile_money";
  masked_reference: string;
  external_kyc_reference: string;
  status: "verified" | "disabled";
  verified_by_user_id: Uuid;
  verified_at: IsoTimestamp;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type TutorPayout = {
  id: Uuid;
  tutor_user_id: Uuid;
  status:
    "requested" | "reviewing" | "processing" | "paid" | "failed" | "cancelled";
  amount_minor: number;
  currency: "BWP";
  provider: string;
  provider_payout_id: string | null;
  destination_reference: string;
  idempotency_key: string;
  ledger_transaction_id: Uuid | null;
  requested_at: IsoTimestamp;
  paid_at: IsoTimestamp | null;
  updated_at: IsoTimestamp;
  credits: number;
  destination_id: Uuid;
  approved_by_user_id: Uuid | null;
  failure_reason: string | null;
  attempt_count: number;
};

export type TutorPayoutEvent = {
  id: Uuid;
  payout_id: Uuid;
  from_status: TutorPayout["status"] | null;
  to_status: TutorPayout["status"];
  attempt_count: number;
  actor_user_id: Uuid;
  provider_reference: string | null;
  reason: string | null;
  ledger_transaction_id: Uuid | null;
  created_at: IsoTimestamp;
};

export type BookingRefund = {
  id: Uuid;
  booking_id: Uuid;
  learner_user_id: Uuid;
  credits: number;
  tutor_adjustment_credits: number;
  platform_adjustment_credits: number;
  reason: string;
  idempotency_key: string;
  ledger_transaction_id: Uuid;
  actor_user_id: Uuid;
  created_at: IsoTimestamp;
};

export type AuditEvent = {
  id: Uuid;
  actor_user_id: Uuid | null;
  action: string;
  entity_type: string;
  entity_id: Uuid | null;
  request_id: string | null;
  ip_hash: string | null;
  before_state: Json | null;
  after_state: Json | null;
  metadata: Json;
  created_at: IsoTimestamp;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
