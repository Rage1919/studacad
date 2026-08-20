import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readDatabaseEnvironment } from "../database-env.mjs";
import type { Database } from "./database.types";

let adminClient: SupabaseClient<Database> | undefined;

export function getDatabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) return adminClient;
  const environment = readDatabaseEnvironment(process.env);
  adminClient = createClient<Database>(environment.supabaseUrl, environment.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: { "X-Client-Info": "studacad-server" }
    }
  });
  return adminClient;
}
