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
