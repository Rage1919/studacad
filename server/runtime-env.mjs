const ENVIRONMENTS = new Set(["development", "test", "preview", "staging", "production"]);
const HTTPS_ENVIRONMENTS = new Set(["preview", "staging", "production"]);

export class RuntimeEnvironmentError extends Error {
  constructor(problems) {
    super(`Invalid Studacad runtime environment:\n- ${problems.join("\n- ")}`);
    this.name = "RuntimeEnvironmentError";
    this.problems = problems;
  }
}

const value = (environment, key) => {
  const current = environment[key];
  return typeof current === "string" ? current.trim() : "";
};

const parseAppUrl = (rawUrl, environmentName, problems) => {
  if (!rawUrl) {
    problems.push("STUDACAD_APP_URL is required.");
    return null;
  }

  try {
    const appUrl = new URL(rawUrl);
    if (!appUrl.hostname) problems.push("STUDACAD_APP_URL must include a hostname.");
    if (appUrl.username || appUrl.password) problems.push("STUDACAD_APP_URL must not contain credentials.");
    if (appUrl.search || appUrl.hash) problems.push("STUDACAD_APP_URL must not contain a query string or fragment.");
    if (HTTPS_ENVIRONMENTS.has(environmentName) && appUrl.protocol !== "https:") {
      problems.push(`STUDACAD_APP_URL must use HTTPS in ${environmentName}.`);
    }
    if (!HTTPS_ENVIRONMENTS.has(environmentName) && !["http:", "https:"].includes(appUrl.protocol)) {
      problems.push("STUDACAD_APP_URL must use HTTP or HTTPS.");
    }
    return appUrl;
  } catch {
    problems.push("STUDACAD_APP_URL must be an absolute URL.");
    return null;
  }
};

export function readRuntimeEnvironment(environment = process.env) {
  const problems = [];
  const name = value(environment, "STUDACAD_ENV");

  if (!name) problems.push("STUDACAD_ENV is required.");
  else if (!ENVIRONMENTS.has(name)) {
    problems.push(`STUDACAD_ENV must be one of: ${[...ENVIRONMENTS].join(", ")}.`);
  }

  const appUrl = parseAppUrl(value(environment, "STUDACAD_APP_URL"), name, problems);
  const releaseSha = value(environment, "STUDACAD_RELEASE_SHA") || null;
  const deployedAt = value(environment, "STUDACAD_DEPLOYED_AT") || null;

  if (releaseSha && !/^[a-f0-9]{7,64}$/i.test(releaseSha)) {
    problems.push("STUDACAD_RELEASE_SHA must be a 7–64 character hexadecimal commit SHA.");
  }
  if (deployedAt && Number.isNaN(Date.parse(deployedAt))) {
    problems.push("STUDACAD_DEPLOYED_AT must be an ISO-8601 timestamp.");
  }
  if (problems.length > 0) throw new RuntimeEnvironmentError(problems);

  return Object.freeze({
    name,
    appUrl: appUrl.origin,
    releaseSha,
    deployedAt
  });
}
