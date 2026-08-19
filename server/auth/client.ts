import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readDatabaseEnvironment } from "../database-env.mjs";
import type { Database } from "../db/database.types";
import { authCookieOptions } from "./cookie-options.mjs";

export async function createServerAuthClient() {
  const cookieStore = await cookies();
  const environment = readDatabaseEnvironment(process.env);
  const cookieOptions = authCookieOptions(process.env.STUDACAD_ENV);
  const responseHeaders = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache"
  });

  const client = createServerClient<Database>(environment.supabaseUrl, environment.publishableKey, {
    auth: { flowType: "pkce" },
    cookieOptions,
    cookies: {
      encode: "tokens-only",
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (cookiesToSet, headers) => {
        for (const [name, value] of Object.entries(headers)) responseHeaders.set(name, value);
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set({
            ...options,
            name,
            value,
            ...cookieOptions
          }));
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes them.
        }
      }
    }
  });

  return { client, responseHeaders };
}
