import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserByAuthSubject, listActiveRoles } from "../db/repositories/user-accounts";
import type { AppRole } from "../db/models";
import { accountAllowsSession, hasRequiredRole, verifiedAuthIdentity } from "./auth-policy.mjs";
import { createServerAuthClient } from "./client";

export type Viewer = Readonly<{
  id: string;
  authSubject: string;
  email: string;
  displayName: string;
  phoneE164: string | null;
  timezone: string;
  roles: AppRole[];
}>;

export class AuthenticationRequiredError extends Error {
  readonly status = 401;
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  readonly status = 403;
  constructor() {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationDeniedError";
  }
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const { client } = await createServerAuthClient();
  const { data, error } = await client.auth.getUser();
  const authUser = data.user;
  if (!verifiedAuthIdentity(authUser, error) || !authUser?.email) return null;

  const account = await findUserByAuthSubject(authUser.id);
  if (!accountAllowsSession(account) || !account) return null;
  const roles = await listActiveRoles(account.id);

  return {
    id: account.id,
    authSubject: authUser.id,
    email: account.email,
    displayName: account.display_name,
    phoneE164: account.phone_e164,
    timezone: account.timezone,
    roles
  };
});

export async function requireViewer(requiredRoles?: AppRole[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AuthenticationRequiredError();
  if (requiredRoles && !hasRequiredRole(viewer.roles, requiredRoles)) throw new AuthorizationDeniedError();
  return viewer;
}

export async function requirePageViewer(returnPath: string, requiredRoles?: AppRole[]): Promise<Viewer> {
  try {
    return await requireViewer(requiredRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect(`/login?next=${encodeURIComponent(returnPath)}`);
    if (error instanceof AuthorizationDeniedError) redirect("/account?error=forbidden");
    throw error;
  }
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthenticationRequiredError || error instanceof AuthorizationDeniedError) {
    return Response.json({ error: error.message }, {
      status: error.status,
      headers: { "Cache-Control": "private, no-store, max-age=0" }
    });
  }
  throw error;
}
