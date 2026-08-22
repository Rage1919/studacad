import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import {
  EMAIL_LINK_RESPONSE,
  normalizeEmail,
  normalizeDisplayName,
  REGISTRATION_LINK_RESPONSE,
  safeReturnPath,
} from "../../../../server/auth/auth-policy.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { createServerAuthClient } from "../../../../server/auth/client";

export async function POST(request: Request) {
  const runtime = readRuntimeEnvironment(process.env);
  try {
    assertSameOrigin(request, runtime.appUrl);
  } catch (error) {
    if (error instanceof CsrfError)
      return Response.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    next?: unknown;
    mode?: unknown;
    displayName?: unknown;
    acceptPolicies?: unknown;
  } | null;
  const email = normalizeEmail(body?.email);
  if (!email)
    return Response.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  const mode = body?.mode === "register" ? "register" : "login";
  const displayName = mode === "register" ? normalizeDisplayName(body?.displayName) : null;
  if (mode === "register" && !displayName)
    return Response.json(
      { error: "Enter your full name using 2–80 characters." },
      { status: 400 },
    );
  if (mode === "register" && body?.acceptPolicies !== true)
    return Response.json(
      { error: "Accept the current Terms and Privacy Notice to continue." },
      { status: 400 },
    );

  const next = safeReturnPath(body?.next);
  const callback = new URL("/auth/callback", runtime.appUrl);
  callback.searchParams.set("next", next);
  const { client, responseHeaders } = await createServerAuthClient();

  // Always return the same accepted response for valid email syntax. This does
  // not disclose whether an account already exists or whether a provider rate
  // limit was reached.
  await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: mode === "register",
      data:
        mode === "register"
          ? {
              display_name: displayName,
              studacad_policy_accepted: "true",
              studacad_policy_version: "2026-08-20",
            }
          : undefined,
    },
  });
  return Response.json(mode === "register" ? REGISTRATION_LINK_RESPONSE : EMAIL_LINK_RESPONSE, {
    status: 202,
    headers: responseHeaders,
  });
}
