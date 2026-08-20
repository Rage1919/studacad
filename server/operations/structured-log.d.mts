export type OperationalLogInput = {
  level?: "info" | "warn" | "error";
  event: string;
  requestId?: string | null;
  details?: Record<string, unknown>;
  now?: Date;
  environment?: string;
  release?: string | null;
};

export function operationalRoute(pathname: string): string;
export function createOperationalLogRecord(
  input: OperationalLogInput,
): Record<string, unknown>;
export function logOperationalEvent(
  input: OperationalLogInput,
): Record<string, unknown>;
