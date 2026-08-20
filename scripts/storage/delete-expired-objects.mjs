import nextEnvironment from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readDatabaseEnvironment } from "../../server/database-env.mjs";

const { loadEnvConfig } = nextEnvironment;
loadEnvConfig(process.cwd());

const environment = readDatabaseEnvironment(process.env);
const client = createClient(environment.supabaseUrl, environment.secretKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
});
const now = new Date().toISOString();
const result = await client
  .from("object_files")
  .select("id,bucket,object_key,owner_user_id,kind,retention_until")
  .lte("retention_until", now)
  .is("deleted_at", null)
  .order("retention_until", { ascending: true })
  .limit(100);
if (result.error) throw result.error;

let deleted = 0;
for (const file of result.data) {
  const latest = await client.from("object_files").select("retention_until,deleted_at").eq("id", file.id).single();
  if (latest.error || latest.data.deleted_at || !latest.data.retention_until || latest.data.retention_until > now) continue;
  const storage = await client.storage.from(file.bucket).remove([file.object_key]);
  if (storage.error) throw storage.error;
  const finalized = await client.rpc("finalize_expired_object_deletion", { p_file_id: file.id });
  if (finalized.error) throw finalized.error;
  if (finalized.data) deleted += 1;
}

process.stdout.write(`Deleted ${deleted} expired private object${deleted === 1 ? "" : "s"}.\n`);
