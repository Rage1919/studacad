export type IsoTimestamp = string;
export type Uuid = string;

export type AccountStatus = "pending_verification" | "active" | "suspended" | "deletion_requested" | "deleted";
export type AppRole = "learner" | "tutor" | "admin";
export type ExamLevel = "PSLE" | "JCE" | "BGCSE";
export type SessionFormat = "online_1to1" | "online_group" | "tutor_place" | "student_place";
export type TutorApplicationStatus = "draft" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "suspended" | "withdrawn";
export type TutorProfileStatus = "draft" | "pending_review" | "active" | "suspended" | "archived";
export type BookingStatus = "pending" | "held" | "confirmed" | "cancelled_by_learner" | "cancelled_by_tutor" | "completed" | "no_show" | "disputed" | "expired" | "refunded";
export type CourseStatus = "draft" | "published" | "archived";
export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "cancelled" | "expired" | "partially_refunded" | "refunded" | "disputed";
export type LedgerTransactionKind = "topup" | "purchase" | "reward" | "refund" | "adjustment" | "hold" | "release" | "chargeback" | "earning" | "payout";

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
}

export type ObjectFile = {
  id: Uuid;
  owner_user_id: Uuid;
  kind: "tutor_identity" | "tutor_qualification" | "learning_resource" | "message_attachment" | "profile_image";
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
}

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
}

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
}

export type Course = {
  id: Uuid;
  slug: string;
  title: string;
  examination: ExamLevel;
  subject: string;
  description: string;
  instructor_tutor_profile_id: Uuid | null;
  price_credits: number;
  status: CourseStatus;
  published_at: IsoTimestamp | null;
  created_by_user_id: Uuid;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type Message = {
  id: Uuid;
  conversation_id: Uuid;
  sender_user_id: Uuid;
  body: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  client_idempotency_key: string;
  provider_message_id: string | null;
  created_at: IsoTimestamp;
  edited_at: IsoTimestamp | null;
  deleted_at: IsoTimestamp | null;
}

export type WalletBalance = {
  wallet_account_id: Uuid;
  balance_credits: number;
}

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
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
