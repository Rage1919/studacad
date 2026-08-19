import "server-only";
import { getDatabaseAdminClient } from "../db/client";
import { readDatabaseEnvironment } from "../database-env.mjs";

const MAX_SIGNED_URL_SECONDS = 15 * 60;

export interface PrivateObjectStorage {
  createSignedDownloadUrl(objectKey: string, expiresInSeconds?: number): Promise<string>;
  remove(objectKeys: string[]): Promise<void>;
}

export class SupabasePrivateObjectStorage implements PrivateObjectStorage {
  async createSignedDownloadUrl(objectKey: string, expiresInSeconds = 5 * 60): Promise<string> {
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > MAX_SIGNED_URL_SECONDS) {
      throw new Error(`Signed URL lifetime must be between 1 and ${MAX_SIGNED_URL_SECONDS} seconds.`);
    }
    if (!objectKey || objectKey.startsWith("/") || objectKey.includes("..")) throw new Error("Invalid private object key.");

    const { privateBucket } = readDatabaseEnvironment(process.env);
    const { data, error } = await getDatabaseAdminClient()
      .storage
      .from(privateBucket)
      .createSignedUrl(objectKey, expiresInSeconds, { download: true });

    if (error) throw new Error("Unable to create a private download URL.", { cause: error });
    return data.signedUrl;
  }

  async remove(objectKeys: string[]): Promise<void> {
    if (objectKeys.length === 0) return;
    const { privateBucket } = readDatabaseEnvironment(process.env);
    const { error } = await getDatabaseAdminClient().storage.from(privateBucket).remove(objectKeys);
    if (error) throw new Error("Unable to remove private objects.", { cause: error });
  }
}
