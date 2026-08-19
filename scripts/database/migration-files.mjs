import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const migrationsDirectory = resolve("supabase", "migrations");

export async function readMigrationFiles(directory = migrationsDirectory) {
  const names = (await readdir(directory))
    .filter(name => /^\d{14}_[a-z0-9_]+\.sql$/.test(name))
    .sort();

  if (names.length === 0) throw new Error(`No migrations found in ${directory}.`);

  return Promise.all(names.map(async name => {
    const sql = await readFile(resolve(directory, name), "utf8");
    return {
      name,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex")
    };
  }));
}
