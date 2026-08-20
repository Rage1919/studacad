import { NextResponse } from "next/server";
import { appendAuditEvent } from "../../../server/db/repositories/audit-events";
import { ensureUserAccount } from "../../../server/db/repositories/user-accounts";
import { safeReturnPath } from "../../../server/auth/auth-policy.mjs";
import { createServerAuthClient } from "../../../server/auth/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeReturnPath(url.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));

  const { client, responseHeaders } = await createServerAuthClient();
  const exchanged = await client.auth.exchangeCodeForSession(code);
  if (exchanged.error) return NextResponse.redirect(new URL("/login?error=expired_link", url.origin));

  const verified = await client.auth.getUser();
  const authUser = verified.data.user;
  if (verified.error || !authUser?.email || !authUser.email_confirmed_at) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=verification_failed", url.origin));
  }

  const account = await ensureUserAccount({
    authSubject: authUser.id,
    email: authUser.email,
    displayName: typeof authUser.user_metadata?.display_name === "string" ? authUser.user_metadata.display_name : null,
    emailVerifiedAt: authUser.email_confirmed_at
  });
  if (account.status !== "active" || account.deleted_at) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.redirect(new URL("/login?error=account_unavailable", url.origin));
  }
  await appendAuditEvent({
    actorUserId: account.id,
    action: "auth.session_started",
    entityType: "user_account",
    entityId: account.id
  });

  const response = NextResponse.redirect(new URL(next, url.origin));
  responseHeaders.forEach((value, name) => response.headers.set(name, value));
  return response;
}
