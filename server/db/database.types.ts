import type { AuditEvent, Booking, Course, Json, Message, ObjectFile, TutorProfile, UserAccount, WalletBalance } from "./models";

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
      tutor_profiles: Table<TutorProfile, Record<string, never>, Partial<TutorProfile>>;
      bookings: Table<Booking, Record<string, never>, Partial<Booking>>;
      courses: Table<Course, Record<string, never>, Partial<Course>>;
      messages: Table<Message, Record<string, never>, Partial<Message>>;
      audit_events: Table<AuditEvent, Omit<AuditEvent, "id" | "created_at"> & { id?: string }, Record<string, never>>;
    };
    Views: {
      wallet_balances: {
        Row: WalletBalance;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      account_status: UserAccount["status"];
      app_role: "learner" | "tutor" | "admin";
      booking_status: Booking["status"];
      course_status: Course["status"];
    };
    CompositeTypes: Record<string, never>;
  };
};

export type { Json };
