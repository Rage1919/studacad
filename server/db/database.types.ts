import type {
  AuditEvent,
  AvailabilityException,
  AvailabilityRule,
  Booking,
  BookingMeeting,
  BookingLocationDetail,
  BookingParticipant,
  BookingRefund,
  ContactBlock,
  Conversation,
  ConversationParticipant,
  Course,
  CoursePurchaseRecord,
  ExamLevel,
  Json,
  Message,
  MessageDelivery,
  MessageReport,
  Notification,
  NotificationPreference,
  NotificationSuppression,
  PolicyDocument,
  PolicyReview,
  SupportCase,
  SupportCaseMessage,
  TutorReport,
  UserPolicyAcceptance,
  ObjectFile,
  LedgerEntry,
  LedgerTransaction,
  LessonProgressRecord,
  LessonRecord,
  PublicTutorMarketplaceProfile,
  ProviderWebhookEvent,
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
  TutorMessagingChannel,
  TutorEarning,
  TutorPayout,
  TutorPayoutDestination,
  TutorPayoutEvent,
  TutorFavouriteRecord,
  UserAccount,
  WalletAccount,
  WalletBalance,
} from "./models";

type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      user_accounts: Table<
        UserAccount,
        {
          id?: string;
          auth_subject: string;
          email: string;
          display_name: string;
          phone_e164?: string | null;
          timezone?: string;
          status?: UserAccount["status"];
          email_verified_at?: string | null;
        },
        Partial<Omit<UserAccount, "id" | "auth_subject" | "created_at">>
      >;
      user_roles: Table<
        {
          user_id: string;
          role: "learner" | "tutor" | "admin";
          granted_by: string | null;
          granted_at: string;
          revoked_at: string | null;
        },
        {
          user_id: string;
          role: "learner" | "tutor" | "admin";
          granted_by?: string | null;
        },
        { revoked_at?: string | null }
      >;
      object_files: Table<
        ObjectFile,
        Omit<
          ObjectFile,
          | "id"
          | "bucket"
          | "scan_status"
          | "scan_provider_reference"
          | "retention_until"
          | "created_at"
          | "deleted_at"
        > & {
          id?: string;
          bucket?: "studacad-private";
          scan_status?: ObjectFile["scan_status"];
          retention_until?: string | null;
        },
        Pick<
          ObjectFile,
          | "scan_status"
          | "scan_provider_reference"
          | "retention_until"
          | "deleted_at"
        >
      >;
      tutor_applications: Table<
        TutorApplication,
        Record<string, never>,
        Partial<TutorApplication>
      >;
      tutor_application_subjects: Table<
        TutorApplicationSubject,
        TutorApplicationSubject,
        Record<string, never>
      >;
      tutor_application_formats: Table<
        TutorApplicationFormat,
        TutorApplicationFormat,
        Record<string, never>
      >;
      tutor_qualifications: Table<
        TutorQualification,
        Record<string, never>,
        Partial<TutorQualification>
      >;
      tutor_application_documents: Table<
        TutorApplicationDocument,
        TutorApplicationDocument,
        Record<string, never>
      >;
      tutor_application_reviews: Table<
        TutorApplicationReview,
        Record<string, never>,
        Record<string, never>
      >;
      tutor_profiles: Table<
        TutorProfile,
        Record<string, never>,
        Partial<TutorProfile>
      >;
      tutor_profile_subjects: Table<
        TutorProfileSubject,
        Record<string, never>,
        Partial<TutorProfileSubject>
      >;
      tutor_profile_formats: Table<
        TutorProfileFormat,
        Record<string, never>,
        Partial<TutorProfileFormat>
      >;
      availability_rules: Table<
        AvailabilityRule,
        Record<string, never>,
        Partial<AvailabilityRule>
      >;
      availability_exceptions: Table<
        AvailabilityException,
        Record<string, never>,
        Partial<AvailabilityException>
      >;
      bookings: Table<Booking, Record<string, never>, Partial<Booking>>;
      booking_meetings: Table<
        BookingMeeting,
        Pick<BookingMeeting, "booking_id" | "creator_user_id"> &
          Partial<BookingMeeting>,
        Partial<BookingMeeting>
      >;
      booking_location_details: Table<
        BookingLocationDetail,
        Record<string, never>,
        Record<string, never>
      >;
      booking_participants: Table<
        BookingParticipant,
        Record<string, never>,
        Partial<BookingParticipant>
      >;
      courses: Table<Course, Record<string, never>, Partial<Course>>;
      lessons: Table<
        LessonRecord,
        Record<string, never>,
        Partial<LessonRecord>
      >;
      quiz_questions: Table<
        QuizQuestionRecord,
        Record<string, never>,
        Partial<QuizQuestionRecord>
      >;
      quiz_options: Table<
        QuizOptionRecord,
        Record<string, never>,
        Partial<QuizOptionRecord>
      >;
      course_purchases: Table<
        CoursePurchaseRecord,
        Record<string, never>,
        Partial<CoursePurchaseRecord>
      >;
      course_resources: Table<
        {
          id: string;
          course_id: string;
          lesson_id: string | null;
          file_id: string;
          title: string;
          created_at: string;
        },
        Record<string, never>,
        Record<string, never>
      >;
      lesson_progress: Table<
        LessonProgressRecord,
        Record<string, never>,
        Partial<LessonProgressRecord>
      >;
      quiz_attempts: Table<
        QuizAttemptRecord,
        Record<string, never>,
        Partial<QuizAttemptRecord>
      >;
      quiz_attempt_answers: Table<
        QuizAttemptAnswerRecord,
        Record<string, never>,
        Partial<QuizAttemptAnswerRecord>
      >;
      tutor_favourites: Table<
        TutorFavouriteRecord,
        TutorFavouriteRecord,
        Record<string, never>
      >;
      referral_codes: Table<
        ReferralCodeRecord,
        Record<string, never>,
        Partial<ReferralCodeRecord>
      >;
      referral_attributions: Table<
        ReferralAttributionRecord,
        Record<string, never>,
        Partial<ReferralAttributionRecord>
      >;
      referral_rewards: Table<
        ReferralRewardRecord,
        Record<string, never>,
        Partial<ReferralRewardRecord>
      >;
      conversations: Table<
        Conversation,
        Record<string, never>,
        Partial<Conversation>
      >;
      conversation_participants: Table<
        ConversationParticipant,
        ConversationParticipant,
        Partial<ConversationParticipant>
      >;
      messages: Table<
        Message,
        Pick<
          Message,
          | "conversation_id"
          | "sender_user_id"
          | "body"
          | "client_idempotency_key"
        > &
          Partial<Message>,
        Partial<Message>
      >;
      tutor_messaging_channels: Table<
        TutorMessagingChannel,
        Record<string, never>,
        Partial<TutorMessagingChannel>
      >;
      message_deliveries: Table<
        MessageDelivery,
        Record<string, never>,
        Partial<MessageDelivery>
      >;
      contact_blocks: Table<
        ContactBlock,
        Omit<ContactBlock, "created_at"> & { created_at?: string },
        Record<string, never>
      >;
      message_reports: Table<
        MessageReport,
        Pick<
          MessageReport,
          "message_id" | "conversation_id" | "reporter_user_id" | "reason"
        > &
          Partial<MessageReport>,
        Partial<MessageReport>
      >;
      wallet_accounts: Table<
        WalletAccount,
        {
          id?: string;
          owner_user_id?: string | null;
          system_code?: string | null;
        },
        Pick<WalletAccount, "closed_at">
      >;
      ledger_transactions: Table<
        LedgerTransaction,
        Record<string, never>,
        Record<string, never>
      >;
      ledger_entries: Table<
        LedgerEntry,
        Record<string, never>,
        Record<string, never>
      >;
      provider_webhook_events: Table<
        ProviderWebhookEvent,
        Omit<
          ProviderWebhookEvent,
          "id" | "received_at" | "processed_at" | "failure_reason"
        > & { id?: string; failure_reason?: string | null },
        Partial<ProviderWebhookEvent>
      >;
      tutor_earnings: Table<
        TutorEarning,
        Record<string, never>,
        Partial<TutorEarning>
      >;
      tutor_payout_destinations: Table<
        TutorPayoutDestination,
        Record<string, never>,
        Partial<TutorPayoutDestination>
      >;
      tutor_payouts: Table<
        TutorPayout,
        Record<string, never>,
        Partial<TutorPayout>
      >;
      tutor_payout_events: Table<
        TutorPayoutEvent,
        Record<string, never>,
        Record<string, never>
      >;
      booking_refunds: Table<
        BookingRefund,
        Record<string, never>,
        Record<string, never>
      >;
      notifications: Table<
        Notification,
        Record<string, never>,
        Partial<Notification>
      >;
      notification_preferences: Table<
        NotificationPreference,
        NotificationPreference,
        Partial<NotificationPreference>
      >;
      notification_suppressions: Table<
        NotificationSuppression,
        Omit<NotificationSuppression, "created_at">,
        Record<string, never>
      >;
      policy_documents: Table<
        PolicyDocument,
        Record<string, never>,
        Record<string, never>
      >;
      user_policy_acceptances: Table<
        UserPolicyAcceptance,
        Record<string, never>,
        Record<string, never>
      >;
      policy_reviews: Table<
        PolicyReview,
        Record<string, never>,
        Record<string, never>
      >;
      support_cases: Table<
        SupportCase,
        Record<string, never>,
        Partial<SupportCase>
      >;
      support_case_messages: Table<
        SupportCaseMessage,
        Record<string, never>,
        Record<string, never>
      >;
      tutor_reports: Table<
        TutorReport,
        Record<string, never>,
        Partial<TutorReport>
      >;
      audit_events: Table<
        AuditEvent,
        Omit<AuditEvent, "id" | "created_at"> & { id?: string },
        Record<string, never>
      >;
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
      operational_readiness_snapshot: {
        Args: Record<string, never>;
        Returns: Json;
      };
      save_tutor_application: {
        Args: {
          p_applicant_user_id: string;
          p_application_id: string | null;
          p_payload: Json;
        };
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
        Args: {
          p_actor_user_id: string;
          p_rules: Json;
          p_exceptions: Json;
          p_settings: Json;
        };
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
        Args: {
          p_actor_user_id: string;
          p_booking_id: string;
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      record_booking_outcome: {
        Args: {
          p_actor_user_id: string;
          p_booking_id: string;
          p_target_status: Booking["status"];
          p_reason: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      purchase_course: {
        Args: {
          p_learner_user_id: string;
          p_course_slug: string;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      submit_quiz_attempt: {
        Args: {
          p_learner_user_id: string;
          p_lesson_id: string;
          p_answers: Json;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      get_or_create_referral_code: {
        Args: { p_owner_user_id: string };
        Returns: string;
      };
      attach_referral_code: {
        Args: { p_referred_user_id: string; p_code: string };
        Returns: string;
      };
      start_tutor_conversation: {
        Args: { p_actor_user_id: string; p_tutor_slug: string };
        Returns: string;
      };
      send_conversation_message: {
        Args: {
          p_actor_user_id: string;
          p_conversation_id: string;
          p_body: string;
          p_client_idempotency_key: string;
        };
        Returns: string;
      };
      admin_create_course: {
        Args: { p_actor_user_id: string; p_payload: Json };
        Returns: string;
      };
      admin_create_lesson: {
        Args: { p_actor_user_id: string; p_payload: Json };
        Returns: string;
      };
      admin_set_course_status: {
        Args: {
          p_actor_user_id: string;
          p_course_id: string;
          p_status: Course["status"];
        };
        Returns: Course["status"];
      };
      admin_set_lesson_status: {
        Args: {
          p_actor_user_id: string;
          p_lesson_id: string;
          p_status: Course["status"];
        };
        Returns: Course["status"];
      };
      release_available_tutor_earnings: {
        Args: { p_limit?: number };
        Returns: number;
      };
      tutor_payout_available_credits: {
        Args: { p_tutor_user_id: string };
        Returns: number;
      };
      verify_tutor_payout_destination: {
        Args: {
          p_actor: string;
          p_tutor: string;
          p_provider: string;
          p_masked: string;
          p_kyc_ref: string;
        };
        Returns: string;
      };
      request_tutor_payout: {
        Args: {
          p_tutor: string;
          p_destination: string;
          p_credits: number;
          p_key: string;
        };
        Returns: string;
      };
      admin_transition_tutor_payout: {
        Args: {
          p_actor: string;
          p_payout: string;
          p_target: TutorPayout["status"];
          p_provider_ref?: string | null;
          p_reason?: string | null;
        };
        Returns: TutorPayout["status"];
      };
      admin_refund_booking: {
        Args: {
          p_actor: string;
          p_booking: string;
          p_learner: string;
          p_credits: number;
          p_reason: string;
          p_key: string;
        };
        Returns: string;
      };
      enqueue_user_notification: {
        Args: {
          p_user: string;
          p_category: string;
          p_template: string;
          p_payload: Json;
          p_event_key: string;
          p_essential: boolean;
          p_scheduled_for?: string;
        };
        Returns: number;
      };
      set_notification_preference: {
        Args: {
          p_user: string;
          p_category: string;
          p_channel: string;
          p_enabled: boolean;
        };
        Returns: boolean;
      };
      claim_notifications: {
        Args: { p_limit: number; p_claim_token: string };
        Returns: Notification[];
      };
      complete_notification: {
        Args: {
          p_id: string;
          p_claim_token: string;
          p_outcome: string;
          p_provider_message_id?: string | null;
          p_error?: string | null;
        };
        Returns: boolean;
      };
      mark_notification_read: {
        Args: { p_user: string; p_id: string };
        Returns: boolean;
      };
      accept_current_policies: {
        Args: {
          p_user: string;
          p_keys: string[];
          p_context: string;
          p_reference: string;
          p_ip_hash?: string | null;
        };
        Returns: number;
      };
      create_support_case: {
        Args: {
          p_user: string;
          p_category: string;
          p_subject: string;
          p_message: string;
          p_booking?: string | null;
        };
        Returns: string;
      };
      add_support_case_message: {
        Args: {
          p_actor: string;
          p_case: string;
          p_body: string;
          p_internal?: boolean;
        };
        Returns: string;
      };
      admin_update_support_case: {
        Args: {
          p_actor: string;
          p_case: string;
          p_status: string;
          p_priority: string;
          p_assignee: string | null;
          p_note?: string | null;
        };
        Returns: string;
      };
      report_tutor: {
        Args: {
          p_user: string;
          p_tutor_slug: string;
          p_reason: string;
          p_booking?: string | null;
        };
        Returns: string;
      };
      record_policy_review: {
        Args: {
          p_actor: string;
          p_version: string;
          p_kind: string;
          p_reviewer: string;
          p_outcome: string;
          p_evidence: string;
          p_next_review: string;
        };
        Returns: string;
      };
    };
    Enums: {
      account_status: UserAccount["status"];
      app_role: "learner" | "tutor" | "admin";
      booking_status: Booking["status"];
      tutor_application_status: TutorApplicationStatus;
      course_status: Course["status"];
      payout_status: TutorPayout["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

export type { Json };
