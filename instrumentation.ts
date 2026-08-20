export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { readRuntimeEnvironment } = await import("./server/runtime-env.mjs");
  const environment = readRuntimeEnvironment(process.env);
  if (["preview", "staging", "production"].includes(environment.name)) {
    const { readDatabaseEnvironment } = await import("./server/database-env.mjs");
    readDatabaseEnvironment(process.env);
  }
}
