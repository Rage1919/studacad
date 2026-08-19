import type { ExamLevel, SessionFormat, TutorApplicationStatus } from "../db/models";

export type TutorApplicationPayload = {
  legalName: string;
  phone: string;
  district: string;
  town: string;
  headline: string;
  biography: string;
  teachingExperience: string;
  qualification: string;
  institution: string;
  languages: string;
  levels: ExamLevel[];
  subjects: string[];
  formats: SessionFormat[];
  basePriceCredits: number;
  sessionDurationMinutes: number;
  days: string[];
  startTime: string;
  endTime: string;
  consent: boolean;
};

export type TutorDocumentSummary = {
  fileId: string;
  documentType: "identity" | "qualification" | "profile_image";
  filename: string;
  contentType: string;
  sizeBytes: number;
  scanStatus: "pending" | "clean" | "rejected" | "failed";
  uploadedAt: string;
};

export type TutorApplicationView = {
  id: string;
  status: TutorApplicationStatus;
  version: number;
  editable: boolean;
  applicantName?: string;
  applicantEmail?: string;
  payload: TutorApplicationPayload;
  documents: TutorDocumentSummary[];
  latestApplicantMessage: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
};
