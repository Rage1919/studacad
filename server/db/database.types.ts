import type {
  AuditEvent,
  AvailabilityException,
  AvailabilityRule,
  Booking,
  BookingLocationDetail,
  BookingParticipant,
  Course,
  CoursePurchaseRecord,
  ExamLevel,
  Json,
  Message,
  ObjectFile,
  LedgerEntry,
  LedgerTransaction,
  LessonProgressRecord,
  LessonRecord,
  PublicTutorMarketplaceProfile,
  QuizAttemptAnswerRecord,
  QuizAttemptRecord,
  QuizOptionRecord,
  QuizQuestionRecord,
  ReferralAttributionRecord,
  ReferralCodeRecord,
  ReferralRewardRecord,
  SessionFormat,
  TutorApplication,
  TutorApplicationDocument,
  TutorApplicationFormat,
  TutorApplicationReview,
  TutorApplicationStatus,
  TutorApplicationSubject,
  TutorProfile,
  TutorProfileFormat,
  TutorProfileSubject,
  TutorQualification,
  TutorFavouriteRecord,
  UserAccount,
  WalletAccount,
  WalletBalance
} from "./models";

type Table<Row extends Record<string, unknown>, Insert extends Record<string, unknown>, Update extends Record<string, unknown>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      user_accounts: Table<UserAccount, {
        id?: string;
        auth_subject: string;
        email: string;
        display_name: string;
        phone_e164?: string | null;
        timezone?: string;
        status?: UserAccount["status"];
        email_verified_at?: string | null;
      }, Partial<Omit<UserAccount, "id" | "auth_subject" | "created_at">>>;
      user_roles: Table<{
        user_id: string;
        role: "learner" | "tutor" | "admin";
        granted_by: string | null;
        granted_at: string;
        revoked_at: string | null;
      }, {
        user_id: string;
        role: "learner" | "tutor" | "admin";
        granted_by?: string | null;
      }, { revoked_at?: string | null }>;
      object_files: Table<ObjectFile, Omit<ObjectFile, "id" | "bucket" | "scan_status" | "scan_provider_reference" | "retention_until" | "created_at" | "deleted_at"> & {
        id?: string;
        bucket?: "studacad-private";
        scan_status?: ObjectFile["scan_status"];
        retention_until?: string | null;
      }, Pick<ObjectFile, "scan_status" | "scan_provider_reference" | "retention_until" | "deleted_at">>;
      tutor_applications: Table<TutorApplication, Record<string, never>, Partial<TutorApplication>>;
      tutor_application_subjects: Table<TutorApplicationSubject, TutorApplicationSubject, Record<string, never>>;
      tutor_application_formats: Table<TutorApplicationFormat, TutorApplicationFormat, Record<string, never>>;
      tutor_qualifications: Table<TutorQualification, Record<string, never>, Partial<TutorQualification>>;
      tutor_application_documents: Table<TutorApplicationDocument, TutorApplicationDocument, Record<string, never>>;
      tutor_application_reviews: Table<TutorApplicationReview, Record<string, never>, Record<string, never>>;
      tutor_profiles: Table<TutorProfile, Record<string, never>, Partial<TutorProfile>>;
      tutor_profile_subjects: Table<TutorProfileSubject, Record<string, never>, Partial<TutorProfileSubject>>;
      tutor_profile_formats: Table<TutorProfileFormat, Record<string, never>, Partial<TutorProfileFormat>>;
      availability_rules: Table<AvailabilityRule, Record<string, never>, Partial<AvailabilityRule>>;
      availability_exceptions: Table<AvailabilityException, Record<string, never>, Partial<AvailabilityException>>;
      bookings: Table<Booking, Record<string, never>, Partial<Booking>>;
      booking_location_details: Table<BookingLocationDetail, Record<string, never>, Record<string, never>>;
      booking_participants: Table<BookingParticipant, Record<string, never>, Partial<BookingParticipant>>;
      courses: Table<Course, Record<string, never>, Partial<Course>>;
      lessons: Table<LessonRecord, Record<string, never>, Partial<LessonRecord>>;
      quiz_questions: Table<QuizQuestionRecord, Record<string, never>, Partial<QuizQuestionRecord>>;
      quiz_options: Table<QuizOptionRecord, Record<string, never>, Partial<QuizOptionRecord>>;
      course_purchases: Table<CoursePurchaseRecord, Record<string, never>, Partial<CoursePurchaseRecord>>;
      course_resources: Table<{ id: string; course_id: string; lesson_id: string | null; file_id: string; title: string; created_at: string }, Record<string, never>, Record<string, never>>;
      lesson_progress: Table<LessonProgressRecord, Record<string, never>, Partial<LessonProgressRecord>>;
      quiz_attempts: Table<QuizAttemptRecord, Record<string, never>, Partial<QuizAttemptRecord>>;
      quiz_attempt_answers: Table<QuizAttemptAnswerRecord, Record<string, never>, Partial<QuizAttemptAnswerRecord>>;
      tutor_favourites: Table<TutorFavouriteRecord, TutorFavouriteRecord, Record<string, never>>;
      referral_codes: Table<ReferralCodeRecord, Record<string, never>, Partial<ReferralCodeRecord>>;
      referral_attributions: Table<ReferralAttributionRecord, Record<string, never>, Partial<ReferralAttributionRecord>>;
      referral_rewards: Table<ReferralRewardRecord, Record<string, never>, Partial<ReferralRewardRecord>>;
      messages: Table<Message, Record<string, never>, Partial<Message>>;
      wallet_accounts: Table<WalletAccount, {
        id?: string;
        owner_user_id?: string | null;
        system_code?: string | null;
      }, Pick<WalletAccount, "closed_at">>;
      ledger_transactions: Table<LedgerTransaction, Record<string, never>, Record<string, never>>;
      ledger_entries: Table<LedgerEntry, Record<string, never>, Record<string, never>>;
      audit_events: Table<AuditEvent, Omit<AuditEvent, "id" | "created_at"> & { id?: string }, Record<string, never>>;
    };
    Views: {
      public_tutor_marketplace_profiles: {
        Row: PublicTutorMarketplaceProfile;
        Relationships: [];
      };
      wallet_balances: {
        Row: WalletBalance;
        Relationships: [];
      };
    };
    Functions: {
      save_tutor_application: {
        Args: { p_applicant_user_id: string; p_application_id: string | null; p_payload: Json };
        Returns: string;
      };
      register_tutor_application_document: {
        Args: {
          p_applicant_user_id: string;
          p_application_id: string;
          p_document_type: string;
          p_kind: ObjectFile["kind"];
          p_object_key: string;
          p_original_filename: string;
          p_content_type: string;
          p_size_bytes: number;
          p_checksum_sha256: string;
          p_scan_provider_reference: string;
        };
        Returns: string;
      };
      transition_tutor_application: {
        Args: {
          p_actor_user_id: string;
          p_application_id: string;
          p_target_status: TutorApplicationStatus;
          p_internal_note?: string | null;
          p_applicant_message?: string | null;
        };
        Returns: TutorApplicationStatus;
      };
      finalize_expired_object_deletion: {
        Args: { p_file_id: string };
        Returns: boolean;
      };
      record_verified_deposit: {
        Args: {
          p_actor_user_id: string;
          p_learner_user_id: string;
          p_amount_bwp: number;
          p_deposit_reference: string;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      list_tutor_slots: {
        Args: {
          p_tutor_slug: string;
          p_from: string;
          p_to: string;
          p_format: SessionFormat;
          p_examination: ExamLevel;
          p_subject: string;
        };
        Returns: Array<{
          tutor_profile_id: string;
          starts_at: string;
          ends_at: string;
          timezone: string;
          format: SessionFormat;
          examination: ExamLevel;
          subject: string;
          price_credits: number;
          capacity: number;
          remaining_capacity: number;
          location_note: string | null;
        }>;
      };
      replace_tutor_availability: {
        Args: { p_actor_user_id: string; p_rules: Json; p_exceptions: Json; p_settings: Json };
        Returns: string;
      };
      create_confirmed_booking: {
        Args: {
          p_learner_user_id: string;
          p_tutor_slug: string;
          p_format: SessionFormat;
          p_examination: ExamLevel;
          p_subject: string;
          p_starts_at: string;
          p_display_timezone: string;
          p_learner_location: string | null;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      cancel_booking_with_refund: {
        Args: { p_actor_user_id: string; p_booking_id: string; p_reason: string; p_idempotency_key: string };
        Returns: Json;
      };
      record_booking_outcome: {
        Args: { p_actor_user_id: string; p_booking_id: string; p_target_status: Booking["status"]; p_reason: string; p_idempotency_key: string };
        Returns: Json;
      };
      purchase_course: {
        Args: { p_learner_user_id: string; p_course_slug: string; p_idempotency_key: string };
        Returns: Json;
      };
      submit_quiz_attempt: {
        Args: { p_learner_user_id: string; p_lesson_id: string; p_answers: Json; p_idempotency_key: string };
        Returns: Json;
      };
      get_or_create_referral_code: { Args: { p_owner_user_id: string }; Returns: string };
      attach_referral_code: { Args: { p_referred_user_id: string; p_code: string }; Returns: string };
      admin_create_course: { Args: { p_actor_user_id: string; p_payload: Json }; Returns: string };
      admin_create_lesson: { Args: { p_actor_user_id: string; p_payload: Json }; Returns: string };
      admin_set_course_status: { Args: { p_actor_user_id: string; p_course_id: string; p_status: Course["status"] }; Returns: Course["status"] };
      admin_set_lesson_status: { Args: { p_actor_user_id: string; p_lesson_id: string; p_status: Course["status"] }; Returns: Course["status"] };
    };
    Enums: {
      account_status: UserAccount["status"];
      app_role: "learner" | "tutor" | "admin";
      booking_status: Booking["status"];
      tutor_application_status: TutorApplicationStatus;
      course_status: Course["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

export type { Json };
