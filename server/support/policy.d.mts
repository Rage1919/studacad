export function normalizeSupportCase(input: unknown): {
  errors: string[];
  value: {
    category: string;
    subject: string;
    message: string;
    bookingId: string | null;
  };
};
export function normalizeCaseMessage(input: unknown): {
  errors: string[];
  value: { caseId: string; message: string; internal: boolean };
};
export function normalizeTutorReport(input: unknown): {
  errors: string[];
  value: { reason: string; bookingId: string | null };
};
export function normalizeAdminCase(input: unknown): {
  errors: string[];
  value: {
    caseId: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    note: string;
  };
};
