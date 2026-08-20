const DEPLOYED_ENVIRONMENTS = new Set(["preview", "staging", "production"]);

export class DatabaseEnvironmentError extends Error {
  constructor(problems) {
    super(`Invalid Studacad database environment:\n- ${problems.join("\n- ")}`);
    this.name = "DatabaseEnvironmentError";
    this.problems = problems;
  }
}

const value = (environment, key) => {
  const current = environment[key];
  return typeof current === "string" ? current.trim() : "";
};

export function databaseIsRequired(environment = process.env) {
  return DEPLOYED_ENVIRONMENTS.has(value(environment, "STUDACAD_ENV"));
}

export function readDatabaseEnvironment(environment = process.env) {
  const problems = [];
  const rawUrl = value(environment, "SUPABASE_URL");
  const publishableKey = value(environment, "SUPABASE_PUBLISHABLE_KEY");
  const secretKey = value(environment, "SUPABASE_SECRET_KEY");
  const privateBucket = value(environment, "SUPABASE_PRIVATE_BUCKET") || "studacad-private";
  let supabaseUrl = null;

  if (!rawUrl) problems.push("SUPABASE_URL is required.");
  else {
    try {
      const parsed = new URL(rawUrl);
      const local = new Set(["localhost", "127.0.0.1", "::1"]).has(parsed.hostname);
      if (!local && parsed.protocol !== "https:") problems.push("SUPABASE_URL must use HTTPS outside local development.");
      if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        problems.push("SUPABASE_URL must not contain credentials, a query string, or a fragment.");
      }
      supabaseUrl = parsed.origin;
    } catch {
      problems.push("SUPABASE_URL must be an absolute URL.");
    }
  }

  if (publishableKey.length < 20) problems.push("SUPABASE_PUBLISHABLE_KEY is required and appears invalid.");
  if (secretKey.length < 20) problems.push("SUPABASE_SECRET_KEY is required and appears invalid.");
  if (privateBucket !== "studacad-private") problems.push("SUPABASE_PRIVATE_BUCKET must be studacad-private.");
  if (problems.length > 0) throw new DatabaseEnvironmentError(problems);

  return Object.freeze({ supabaseUrl, publishableKey, secretKey, privateBucket });
}
