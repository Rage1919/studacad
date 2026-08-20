import "server-only";
import { getDatabaseAdminClient } from "../db/client";

export type OperationalSnapshot = {
  database: "ok";
  ledgerUnbalancedTransactions: number;
  notificationOverdue: number;
  notificationDeadLetters: number;
  messageOverdue: number;
  messageSupportRequired: number;
  meetingOverdue: number;
  meetingSupportRequired: number;
  failedWebhooks: number;
  failedPayouts: number;
  payoutClearingCredits: number;
  expectedPayoutClearingCredits: number;
  payoutClearingBalanced: boolean;
  measuredAt: string;
};

export async function getOperationalSnapshot(): Promise<OperationalSnapshot> {
  const result = await getDatabaseAdminClient().rpc(
    "operational_readiness_snapshot",
  );
  if (result.error || !result.data)
    throw new Error("Operational database snapshot is unavailable.");
  return result.data as unknown as OperationalSnapshot;
}

export const operationalSnapshotHealthy = (snapshot: OperationalSnapshot) =>
  snapshot.database === "ok" &&
  snapshot.ledgerUnbalancedTransactions === 0 &&
  snapshot.notificationOverdue === 0 &&
  snapshot.notificationDeadLetters === 0 &&
  snapshot.messageOverdue === 0 &&
  snapshot.messageSupportRequired === 0 &&
  snapshot.meetingOverdue === 0 &&
  snapshot.meetingSupportRequired === 0 &&
  snapshot.failedWebhooks === 0 &&
  snapshot.failedPayouts === 0 &&
  snapshot.payoutClearingBalanced;
