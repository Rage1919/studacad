export const APPLICATION_STATUSES = Object.freeze([
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "approved",
  "rejected",
  "suspended",
  "withdrawn"
]);

export const EXAM_LEVELS = Object.freeze(["PSLE", "JCE", "BGCSE"]);
export const SESSION_FORMATS = Object.freeze(["online_1to1", "online_group", "tutor_place", "student_place"]);
export const DOCUMENT_TYPES = Object.freeze(["profile_image", "qualification", "identity"]);

const applicantTransitions = new Set([
  "draft:submitted",
  "changes_requested:submitted",
  "draft:withdrawn",
  "submitted:withdrawn",
  "under_review:withdrawn",
  "changes_requested:withdrawn"
]);

const reviewerTransitions = new Set([
  "submitted:under_review",
  "under_review:changes_requested",
  "under_review:approved",
  "under_review:rejected",
  "approved:suspended",
  "suspended:approved"
]);

const string = (value, maximum = 600) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const list = value => Array.isArray(value) ? value.filter(item => typeof item === "string") : [];

export function canTransitionApplication(from, to, actor) {
  const transitions = actor === "reviewer" ? reviewerTransitions : applicantTransitions;
  return transitions.has(`${from}:${to}`);
}

export function applicationIsEditable(status) {
  return status === "draft" || status === "changes_requested";
}

export function normalizeBotswanaPhone(value) {
  const compact = string(value, 24).replace(/[\s()-]/g, "");
  if (/^[237][0-9]{7}$/.test(compact)) return `+267${compact}`;
  return /^\+[1-9][0-9]{7,14}$/.test(compact) ? compact : "";
}

export function normalizeApplicationPayload(input) {
  const source = input && typeof input === "object" ? input : {};
  const levels = [...new Set(list(source.levels).filter(value => EXAM_LEVELS.includes(value)))];
  const subjects = [...new Set(list(source.subjects).map(value => string(value, 80)).filter(Boolean))];
  const formats = [...new Set(list(source.formats).filter(value => SESSION_FORMATS.includes(value)))];
  const days = [...new Set(list(source.days).filter(value => /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(value)))];

  return {
    legalName: string(source.legalName, 160),
    phoneE164: normalizeBotswanaPhone(source.phone),
    district: string(source.district, 80),
    town: string(source.town, 120),
    headline: string(source.headline, 80),
    biography: string(source.biography, 600),
    teachingExperience: string(source.teachingExperience, 80),
    qualification: string(source.qualification, 160),
    institution: string(source.institution, 160),
    languages: [...new Set(string(source.languages, 240).split(",").map(value => value.trim()).filter(Boolean))],
    levels,
    subjects,
    formats,
    basePriceCredits: Number(source.basePriceCredits),
    sessionDurationMinutes: Number(source.sessionDurationMinutes),
    days,
    startTime: string(source.startTime, 5),
    endTime: string(source.endTime, 5),
    consent: source.consent === true
  };
}

export function validateApplicationPayload(payload, { submission = false } = {}) {
  const problems = [];
  const optional = (value, check, message) => { if (value && !check(value)) problems.push(message); };

  optional(payload.legalName, value => value.length >= 2, "Enter your full legal name.");
  if (payload.phoneE164 === "" && submission) problems.push("Enter a valid mobile number, including country code.");
  optional(payload.headline, value => value.length >= 20, "Write a headline of at least 20 characters.");
  optional(payload.biography, value => value.length >= 80, "Write a biography of at least 80 characters.");
  if (Number.isFinite(payload.basePriceCredits) && payload.basePriceCredits !== 0 && payload.basePriceCredits < 50) problems.push("The minimum lesson rate is 50 credits.");
  if (payload.startTime && payload.endTime && payload.startTime >= payload.endTime) problems.push("Availability must end after it starts.");

  if (submission) {
    if (payload.legalName.length < 2) problems.push("Enter your full legal name.");
    if (!payload.district || !payload.town) problems.push("Select a district and enter a town or village.");
    if (payload.headline.length < 20) problems.push("Write a headline of at least 20 characters.");
    if (payload.biography.length < 80) problems.push("Write a biography of at least 80 characters.");
    if (!payload.teachingExperience || !payload.qualification || !payload.institution) problems.push("Complete your teaching background and qualification.");
    if (!payload.languages.length) problems.push("Add at least one lesson language.");
    if (!payload.levels.length || !payload.subjects.length) problems.push("Select at least one exam level and subject.");
    if (!payload.formats.length || !payload.days.length) problems.push("Select at least one lesson format and available day.");
    if (!Number.isInteger(payload.basePriceCredits) || payload.basePriceCredits < 50) problems.push("Enter a lesson rate of at least 50 credits.");
    if (![30, 45, 60, 90].includes(payload.sessionDurationMinutes)) problems.push("Choose a supported session length.");
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(payload.startTime) || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(payload.endTime)) problems.push("Enter a valid availability time range.");
    if (!payload.consent) problems.push("Confirm the application and document consent.");
  }

  return [...new Set(problems)];
}

export function uploadPolicy(documentType) {
  if (documentType === "profile_image") return { kind: "profile_image", maximumBytes: 5_000_000, contentTypes: ["image/jpeg", "image/png"] };
  if (documentType === "qualification") return { kind: "tutor_qualification", maximumBytes: 10_000_000, contentTypes: ["application/pdf", "image/jpeg", "image/png"] };
  if (documentType === "identity") return { kind: "tutor_identity", maximumBytes: 10_000_000, contentTypes: ["application/pdf", "image/jpeg", "image/png"] };
  return null;
}

export function contentMatchesSignature(bytes, contentType) {
  if (!(bytes instanceof Uint8Array)) return false;
  if (contentType === "application/pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (contentType === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg") return bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return false;
}

export function validateUploadMetadata(documentType, file) {
  const policy = uploadPolicy(documentType);
  if (!policy) return ["Choose a supported document type."];
  const problems = [];
  if (!file || typeof file !== "object") return ["Choose a file to upload."];
  if (!policy.contentTypes.includes(file.type)) problems.push("This file type is not allowed.");
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > policy.maximumBytes) problems.push(`The file must be smaller than ${policy.maximumBytes / 1_000_000} MB.`);
  return problems;
}
