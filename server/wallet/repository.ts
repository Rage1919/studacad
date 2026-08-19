import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import type { LedgerTransactionKind } from "../db/models";

export type WalletHistoryItem = Readonly<{
  id: string;
  type: LedgerTransactionKind;
  label: string;
  amount: number;
  createdAt: string;
}>;

export type WalletSnapshot = Readonly<{
  balance: number;
  transactions: WalletHistoryItem[];
}>;

const safeCredits = (value: number | string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("Wallet balance exceeds the supported range.");
  return parsed;
};

async function ensureWalletAccount(userId: string) {
  const database = getDatabaseAdminClient();
  const existing = await database.from("wallet_accounts").select("*").eq("owner_user_id", userId).maybeSingle();
  if (existing.error) throw new Error("Unable to load the wallet account.", { cause: existing.error });
  if (existing.data) return existing.data;

  const created = await database.from("wallet_accounts").insert({ owner_user_id: userId }).select("*").single();
  if (!created.error) return created.data;
  const concurrent = await database.from("wallet_accounts").select("*").eq("owner_user_id", userId).single();
  if (concurrent.error) throw new Error("Unable to create the wallet account.", { cause: created.error });
  return concurrent.data;
}

export async function getWalletSnapshot(userId: string): Promise<WalletSnapshot> {
  const database = getDatabaseAdminClient();
  const wallet = await ensureWalletAccount(userId);
  const [balanceResult, entriesResult] = await Promise.all([
    database.from("wallet_balances").select("*").eq("wallet_account_id", wallet.id).maybeSingle(),
    database.from("ledger_entries").select("*").eq("wallet_account_id", wallet.id).order("created_at", { ascending: false }).limit(100)
  ]);
  if (balanceResult.error) throw new Error("Unable to load the wallet balance.", { cause: balanceResult.error });
  if (entriesResult.error) throw new Error("Unable to load wallet activity.", { cause: entriesResult.error });

  const transactionIds = entriesResult.data.map(entry => entry.transaction_id);
  const transactionResult = transactionIds.length
    ? await database.from("ledger_transactions").select("*").in("id", transactionIds)
    : { data: [], error: null };
  if (transactionResult.error) throw new Error("Unable to load wallet transaction details.", { cause: transactionResult.error });
  const transactions = new Map(transactionResult.data.map(transaction => [transaction.id, transaction]));

  return {
    balance: balanceResult.data ? safeCredits(balanceResult.data.balance_credits) : 0,
    transactions: entriesResult.data.flatMap(entry => {
      const transaction = transactions.get(entry.transaction_id);
      return transaction ? [{
        id: entry.id,
        type: transaction.kind,
        label: transaction.description,
        amount: safeCredits(entry.amount_credits),
        createdAt: entry.created_at
      }] : [];
    })
  };
}

export async function recordVerifiedDeposit(input: {
  actorUserId: string;
  learnerUserId: string;
  amountBwp: number;
  depositReference: string;
  idempotencyKey: string;
}): Promise<string> {
  const { data, error } = await getDatabaseAdminClient().rpc("record_verified_deposit", {
    p_actor_user_id: input.actorUserId,
    p_learner_user_id: input.learnerUserId,
    p_amount_bwp: input.amountBwp,
    p_deposit_reference: input.depositReference,
    p_idempotency_key: input.idempotencyKey
  });
  if (error) throw new Error("Unable to record the verified deposit.", { cause: error });
  return data;
}
