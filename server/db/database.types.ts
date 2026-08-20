import type {
  AuditEvent,
  Booking,
  Course,
  Json,
  Message,
  ObjectFile,
  LedgerEntry,
  LedgerTransaction,
  PublicTutorMarketplaceProfile,
  TutorApplication,
  TutorApplicationDocument,
  TutorApplicationFormat,
  TutorApplicationReview,
  TutorApplicationStatus,
  TutorApplicationSubject,
  TutorProfile,
  TutorQualification,
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
      bookings: Table<Booking, Record<string, never>, Partial<Booking>>;
      courses: Table<Course, Record<string, never>, Partial<Course>>;
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
