import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readDatabaseEnvironment } from "./server/database-env.mjs";
import type { Database } from "./server/db/database.types";
import { authCookieOptions } from "./server/auth/cookie-options.mjs";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const environment = readDatabaseEnvironment(process.env);
  const cookieOptions = authCookieOptions(process.env.STUDACAD_ENV);
  const client = createServerClient<Database>(environment.supabaseUrl, environment.publishableKey, {
    auth: { flowType: "pkce" },
    cookieOptions,
    cookies: {
      encode: "tokens-only",
      getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({
          ...options,
          name,
          value,
          ...cookieOptions
        }));
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      }
    }
  });

  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
