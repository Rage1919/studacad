import "server-only";
import { getDatabaseAdminClient } from "../client";
import type { UserAccount } from "../models";

export async function findUserByAuthSubject(authSubject: string): Promise<UserAccount | null> {
  const { data, error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .select("*")
    .eq("auth_subject", authSubject)
    .maybeSingle();

  if (error) throw new Error("Unable to load the user account.", { cause: error });
  return data;
}

export async function findActiveUserByEmail(email: string): Promise<UserAccount | null> {
  const { data, error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error("Unable to load the learner account.", { cause: error });
  return data;
}

export async function createUserAccount(input: {
  authSubject: string;
  email: string;
  displayName: string;
  timezone?: string;
}): Promise<UserAccount> {
  const { data, error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .insert({
      auth_subject: input.authSubject,
      email: input.email.trim().toLowerCase(),
      display_name: input.displayName.trim(),
      timezone: input.timezone ?? "Africa/Gaborone"
    })
    .select("*")
    .single();

  if (error) throw new Error("Unable to create the user account.", { cause: error });
  return data;
}

export async function ensureUserAccount(input: {
  authSubject: string;
  email: string;
  displayName?: string | null;
  emailVerifiedAt?: string | null;
}): Promise<UserAccount> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await findUserByAuthSubject(input.authSubject);
  let data: UserAccount;

  if (existing) {
    const nextStatus = existing.status === "pending_verification" && input.emailVerifiedAt ? "active" : existing.status;
    const result = await getDatabaseAdminClient()
      .from("user_accounts")
      .update({ email: normalizedEmail, email_verified_at: input.emailVerifiedAt ?? existing.email_verified_at, status: nextStatus })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (result.error) throw new Error("Unable to synchronize the user account.", { cause: result.error });
    data = result.data;
  } else {
    const result = await getDatabaseAdminClient()
      .from("user_accounts")
      .insert({
        auth_subject: input.authSubject,
        email: normalizedEmail,
        display_name: input.displayName?.trim() || normalizedEmail.split("@")[0],
        status: input.emailVerifiedAt ? "active" : "pending_verification",
        email_verified_at: input.emailVerifiedAt ?? null
      })
      .select("*")
      .single();
    if (result.error) throw new Error("Unable to synchronize the user account.", { cause: result.error });
    data = result.data;
  }

  const roleResult = await getDatabaseAdminClient().from("user_roles").upsert({
    user_id: data.id,
    role: "learner"
  }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleResult.error) throw new Error("Unable to initialize the learner role.", { cause: roleResult.error });
  return data;
}

export async function listActiveRoles(userId: string) {
  const { data, error } = await getDatabaseAdminClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new Error("Unable to load account roles.", { cause: error });
  return data.map(item => item.role);
}

export async function updateOwnProfile(userId: string, input: {
  displayName: string;
  phoneE164: string | null;
  timezone: string;
}): Promise<UserAccount> {
  const { data, error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .update({ display_name: input.displayName, phone_e164: input.phoneE164, timezone: input.timezone })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error("Unable to update the account profile.", { cause: error });
  return data;
}

export async function requestAccountExport(userId: string): Promise<void> {
  const { error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .update({ export_requested_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error("Unable to request an account export.", { cause: error });
}

export async function requestAccountDeletion(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getDatabaseAdminClient()
    .from("user_accounts")
    .update({ status: "deletion_requested", deletion_requested_at: now })
    .eq("id", userId);
  if (error) throw new Error("Unable to request account deletion.", { cause: error });
}
