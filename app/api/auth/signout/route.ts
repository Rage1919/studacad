import { NextResponse } from "next/server";
import { readRuntimeEnvironment } from "../../../../server/runtime-env.mjs";
import { assertSameOrigin, CsrfError } from "../../../../server/auth/csrf.mjs";
import { createServerAuthClient } from "../../../../server/auth/client";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, readRuntimeEnvironment(process.env).appUrl);
  } catch (error) {
    if (error instanceof CsrfError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const { client, responseHeaders } = await createServerAuthClient();
  await client.auth.signOut({ scope: "local" });
  return NextResponse.json({ signedOut: true }, { headers: responseHeaders });
}
