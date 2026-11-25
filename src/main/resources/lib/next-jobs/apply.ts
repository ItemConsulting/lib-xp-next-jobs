import { request } from "/lib/http-client";
import { getConfig } from "./client";
import type {
  SiteApplyCustomField,
  SiteApplyCustomFieldType,
  SiteApplyField,
  SiteApplyFieldKey,
  SiteApplyForm,
  SiteApplySection,
  SiteApplySectionKey,
  SiteCvDraft,
  SiteCvEducation,
  SiteCvEmployment,
  SiteCvReader,
  SiteCvReadSetup,
} from "./types";
import type { ByteSource } from "@enonic-types/core";

/* ============================================================================
 * The application from the site, sent on to Next.
 *
 * Next owns the application: the fields, the privacy text and the limits on
 * the file come from Next, and the site forwards what the candidate sends
 * from its server. Nothing of the application is stored or logged here: not
 * the fields, not the file, not the candidate's address. The log only says
 * the status and the position id.
 * ========================================================================== */

/*
 * In lib-http-client 3.x, connectionTimeout is also the time to wait for the
 * answer's headers, not only for the connection, and readTimeout only starts
 * when the body comes. So for the calls where Next works a while before it
 * answers, connectionTimeout is what has to be long.
 */
const CONNECTION_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 10000;
/** The upload can take a while on a slow line, and Next saves the CV before it answers */
const SUBMIT_TIMEOUT_MS = 30000;
/**
 * Reading with AI waits for the model before Next answers: about five seconds
 * for a short CV, more for a long one. Next's own form waits up to 60 seconds
 * for the same reading
 */
const CV_READ_TIMEOUT_MS = 60000;
/** How long a form is used before asking Next again, like the list */
const FRESH_MS = 60 * 1000;

export type ApplyLanguage = "nb" | "en";

/**
 * - `ok`: the form to show
 * - `closed`: the position takes no applications from the site (404): closed,
 *   past the deadline, not published, or the feature is turned off in Next
 * - `unavailable`: Next failed or isn't configured. Link to the form in Next
 */
export type ApplyFormResult = { status: "ok"; form: SiteApplyForm } | { status: "closed" } | { status: "unavailable" };

type CacheEntry = {
  result: ApplyFormResult;
  /** Epoch millis. Until then, the result is reused without calling Next */
  until: number;
};

/*
 * Keyed by site, language and position id: two sites can be two tenants in
 * Next, with the same ids for different positions. Only ids from the list are
 * asked for (the caller checks), so the cache can't grow from made-up ids
 */
let cache: Record<string, CacheEntry> = {};

export function getApplyForm(siteKey: string, positionId: string, language: ApplyLanguage): ApplyFormResult {
  const now = Date.now();
  const key = `${siteKey}|${language}:${positionId}`;
  const cached = cache[key];

  if (cached && now < cached.until) {
    return cached.result;
  }

  const result = fetchForm(siteKey, positionId, language);

  // A failed call keeps the last good form, as the list does
  const kept = result.status === "unavailable" && cached?.result.status === "ok" ? cached.result : result;

  cache = { ...pruned(cache, now), [key]: { result: kept, until: now + FRESH_MS } };

  return kept;
}

/**
 * Asks Next for the form now, past the cache: what the admin tool's check
 * shows must be what Next answers at this moment, not the last good form
 */
export function checkApplyForm(siteKey: string, positionId: string, language: ApplyLanguage): ApplyFormResult {
  return fetchForm(siteKey, positionId, language);
}

/** Drops entries that ran out long ago, so positions taken down don't stay in memory */
function pruned(entries: Record<string, CacheEntry>, now: number): Record<string, CacheEntry> {
  const kept: Record<string, CacheEntry> = {};

  Object.keys(entries).forEach((key) => {
    if (entries[key].until > now - 10 * FRESH_MS) {
      kept[key] = entries[key];
    }
  });

  return kept;
}

function fetchForm(siteKey: string, positionId: string, language: ApplyLanguage): ApplyFormResult {
  const config = getConfig(siteKey);

  if (!config) {
    return { status: "unavailable" };
  }

  let response;

  try {
    response = request({
      url: `${config.baseUrl}/api/nettside/v1/stillinger/${encodeURIComponent(positionId)}/skjema`,
      method: "GET",
      queryParams: { sprak: language },
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + config.apiKey,
      },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      readTimeout: READ_TIMEOUT_MS,
      // A redirect could drop the key or send it on to another host
      followRedirects: false,
    });
  } catch (e) {
    log.warning("next-apply: the call for the form failed (position=%s): %s", positionId, errorMessage(e));
    return { status: "unavailable" };
  }

  if (response.status === 404) {
    return { status: "closed" };
  }

  if (response.status !== 200) {
    log.warning("next-apply: the form answered %s (position=%s)", response.status, positionId);
    return { status: "unavailable" };
  }

  const form = parseForm(response.body);

  if (!form) {
    log.error("next-apply: the form answered 200 with a body that isn't a form (position=%s)", positionId);
    return { status: "unavailable" };
  }

  return { status: "ok", form };
}

const FIELD_KEYS: SiteApplyFieldKey[] = [
  "phone",
  "location",
  "currentTitle",
  "currentEmployer",
  "yearsExperience",
  "linkedin",
  "summary",
  "employments",
  "educations",
  "skills",
  "languages",
  "certifications",
];

export function isFieldKey(value: unknown): value is SiteApplyFieldKey {
  return typeof value === "string" && FIELD_KEYS.indexOf(value as SiteApplyFieldKey) !== -1;
}

/** Keeps only what the form can use. A field the site doesn't know is left out, not guessed at */
export function parseForm(body: string | null | undefined): SiteApplyForm | undefined {
  let json: unknown;

  try {
    json = JSON.parse(body ?? "");
  } catch (_e) {
    return undefined;
  }

  if (!isObject(json) || !Array.isArray(json.fields) || !isObject(json.cv) || !isObject(json.privacy)) {
    return undefined;
  }

  const privacyText = text(json.privacy.text);
  const privacyUrl = httpsUrl(json.privacy.url);
  const maxBytes = json.cv.maxBytes;

  if (!privacyText || !privacyUrl || typeof maxBytes !== "number" || maxBytes <= 0) {
    return undefined;
  }

  const fields: SiteApplyField[] = [];

  json.fields.forEach((raw: unknown) => {
    if (isObject(raw) && isFieldKey(raw.key)) {
      fields.push({
        key: raw.key,
        required: raw.required === true,
        section: isSectionKey(raw.section) ? raw.section : undefined,
      });
    }
  });

  const extensions = parseExtensions(json.cv.extensions);
  const talentPoolText = isObject(json.talentPool) ? text(json.talentPool.text) : undefined;
  const months = isObject(json.talentPool) ? json.talentPool.months : undefined;

  return {
    positionId: text(json.positionId) ?? "",
    title: text(json.title) ?? "",
    sections: parseSections(json.sections),
    fields,
    customFields: parseCustomFields(json.customFields),
    cv: { maxBytes, extensions },
    privacy: { text: privacyText, url: privacyUrl },
    // Without the text there is nothing to consent to, so the checkbox is left out
    talentPool: { text: talentPoolText ?? "", months: typeof months === "number" ? months : 0 },
    cvRead: parseCvRead(json.cvRead),
  };
}

const SECTION_KEYS: SiteApplySectionKey[] = ["about", "experience", "skills", "position"];

function isSectionKey(value: unknown): value is SiteApplySectionKey {
  return typeof value === "string" && SECTION_KEYS.indexOf(value as SiteApplySectionKey) !== -1;
}

function parseSections(raw: unknown): SiteApplySection[] {
  return list(raw, (item): SiteApplySection | undefined => {
    const title = isObject(item) ? text(item.title) : undefined;

    return isObject(item) && isSectionKey(item.key) && title ? { key: item.key, title } : undefined;
  });
}

const CUSTOM_TYPES: SiteApplyCustomFieldType[] = [
  "text",
  "number",
  "longtext",
  "radio",
  "select",
  "checkbox",
  "multi",
  "list",
];
const CHOICE_TYPES: SiteApplyCustomFieldType[] = ["radio", "select", "multi"];

/** The name a field of the tenant's own is sent under: `cf.` and the id Next made */
export function isCustomFieldName(value: unknown): value is `cf.${string}` {
  return typeof value === "string" && /^cf\.[\w-]{1,60}$/.test(value);
}

/**
 * The tenant's own fields, field by field. A field this library can't draw (a
 * type from a newer Next, a choice without options) is left out. When such a
 * field is required, all of them are left out: the form then sends no mark,
 * Next reads none of them, and the application isn't stopped by a question
 * the candidate never saw
 */
export function parseCustomFields(raw: unknown): SiteApplyCustomField[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const fields: SiteApplyCustomField[] = [];
  let missedRequired = false;

  raw.forEach((item: unknown) => {
    const field = parseCustomField(item);

    if (field) {
      fields.push(field);
    } else if (isObject(item) && item.required === true) {
      missedRequired = true;
    }
  });

  return missedRequired ? [] : fields;
}

function parseCustomField(raw: unknown): SiteApplyCustomField | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const id = text(raw.id);
  const label = text(raw.label);
  const type = CUSTOM_TYPES.filter((known) => known === raw.type)[0];

  // The name must be the one made from the id: nothing else is sent on to Next
  if (!id || !label || !type || raw.name !== `cf.${id}` || !isCustomFieldName(raw.name)) {
    return undefined;
  }

  const options = list(raw.options, (item): { id: string; label: string } | undefined => {
    const optionId = isObject(item) ? text(item.id) : undefined;
    const optionLabel = isObject(item) ? text(item.label) : undefined;

    return optionId && optionLabel ? { id: optionId, label: optionLabel } : undefined;
  });

  if (CHOICE_TYPES.indexOf(type) !== -1 && options.length === 0) {
    return undefined;
  }

  return {
    id,
    name: raw.name,
    label,
    help: text(raw.help),
    type,
    required: raw.required === true,
    section: isSectionKey(raw.section) ? raw.section : "about",
    options: CHOICE_TYPES.indexOf(type) !== -1 ? options : undefined,
    min: type === "number" ? finite(raw.min) : undefined,
    max: type === "number" ? finite(raw.max) : undefined,
    integer: type === "number" ? raw.integer === true : undefined,
    maxLength: positive(raw.maxLength),
    maxItems: type === "list" ? positive(raw.maxItems) : undefined,
  };
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) ? value : undefined;
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value > 0 ? Math.floor(value) : undefined;
}

/** File extensions with the dot, in lower case. Anything else is left out */
function parseExtensions(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && /^\.[a-z0-9]+$/i.test(item))
        .map((item) => item.toLowerCase())
    : [];
}

/** Undefined when the reading is off in Next, or the setup is missing something the form needs */
function parseCvRead(raw: unknown): SiteCvReadSetup | undefined {
  if (!isObject(raw) || !Array.isArray(raw.readers)) {
    return undefined;
  }

  const ai = isObject(raw.ai) ? { label: text(raw.ai.label), text: text(raw.ai.text) } : undefined;
  // «ai» only counts with the words that tell the candidate what it means
  const readers = raw.readers.filter(
    (reader): reader is SiteCvReader => reader === "local" || (reader === "ai" && !!ai?.label && !!ai.text),
  );
  const description = text(raw.text);
  const localLabel = text(raw.localLabel);

  if (readers.indexOf("local") === -1 || typeof raw.maxBytes !== "number" || !description || !localLabel) {
    return undefined;
  }

  return {
    readers: ["local", ...readers.filter((reader) => reader === "ai")],
    maxBytes: raw.maxBytes,
    extensions: parseExtensions(raw.extensions),
    text: description,
    localLabel,
    ai: ai?.label && ai.text ? { label: ai.label, text: ai.text } : undefined,
  };
}

/**
 * - `ok`: the draft, with only the fields the form knows
 * - `unreadable`: Next couldn't read the file. `error` is Next's code (`err.cvType` …)
 * - `unavailable`: «ai» was chosen, but Next has no AI reader (503)
 * - the rest as for the submission
 */
export type CvReadResult =
  | { status: "ok"; draft: SiteCvDraft; count: number }
  | { status: "unreadable"; error: string }
  | { status: "unavailable" }
  | { status: "closed" }
  | { status: "tooLarge" }
  | { status: "tooMany" }
  | { status: "failed" };

/**
 * Sends the CV to Next to be read, once. Next stores nothing: the answer is a
 * draft of the fields, and the file comes again with the application
 */
export function readCv(
  siteKey: string,
  positionId: string,
  cv: ApplyPart,
  reader: SiteCvReader,
  applicantAddress: string,
): CvReadResult {
  const config = getConfig(siteKey);

  if (!config) {
    log.warning("next-cv: not read, the address of Next or the API key is missing (position=%s)", positionId);
    return { status: "failed" };
  }

  let response;

  try {
    response = request({
      url: `${config.baseUrl}/api/nettside/v1/stillinger/${encodeURIComponent(positionId)}/cv`,
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + config.apiKey,
        "X-Applicant-Address": applicantAddress,
      },
      multipart: [{ name: "leser", value: reader }, cv],
      connectionTimeout: CV_READ_TIMEOUT_MS,
      readTimeout: CV_READ_TIMEOUT_MS,
      followRedirects: false,
    });
  } catch (e) {
    log.warning("next-cv: the reading failed (position=%s): %s", positionId, errorMessage(e));
    return { status: "failed" };
  }

  // Only the status, the reader and the position. Never the file or what was read from it
  log.info("next-cv: the reading answered %s (position=%s, reader=%s)", response.status, positionId, reader);

  switch (response.status) {
    case 200:
      return parseCvAnswer(response.body);
    case 400:
      return getUnreadable(response.body);
    case 401:
      log.error("next-cv: the reading answered 401, check the API key");
      return { status: "failed" };
    case 404:
      return { status: "closed" };
    case 413:
      return { status: "tooLarge" };
    case 429:
      return { status: "tooMany" };
    case 503:
      return { status: "unavailable" };
    default:
      return { status: "failed" };
  }
}

function parseCvAnswer(body: string | null): CvReadResult {
  const json = parseJson(body);
  const draft = isObject(json) ? parseDraft(json.draft) : undefined;

  if (!draft || !isObject(json)) {
    log.error("next-cv: the reading answered 200 with a body that isn't a draft");
    return { status: "failed" };
  }

  return { status: "ok", draft, count: typeof json.count === "number" ? json.count : 0 };
}

/** A 400 about the file goes to the candidate. Anything else is about the request */
function getUnreadable(body: string | null): CvReadResult {
  const json = parseJson(body);
  const error = isObject(json) ? text(json.error) : undefined;

  if (error && error.indexOf("err.cv") === 0) {
    return { status: "unreadable", error };
  }

  log.error("next-cv: the reading answered 400: %s", error ?? "unknown");
  return { status: "failed" };
}

/** Field by field, so only strings and lists of strings reach the page */
export function parseDraft(raw: unknown): SiteCvDraft | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const years = raw.yearsExperience;

  return {
    name: text(raw.name),
    email: text(raw.email),
    phone: text(raw.phone),
    location: text(raw.location),
    linkedin: text(raw.linkedin),
    currentTitle: text(raw.currentTitle),
    currentEmployer: text(raw.currentEmployer),
    yearsExperience: typeof years === "number" && years >= 0 && years < 80 ? Math.round(years) : undefined,
    summary: text(raw.summary),
    employments: list(raw.employments, (item): SiteCvEmployment | undefined =>
      isObject(item) && (text(item.employer) || text(item.role))
        ? {
            employer: text(item.employer) ?? "",
            role: text(item.role) ?? "",
            from: period(item.from),
            to: period(item.to),
          }
        : undefined,
    ),
    educations: list(raw.educations, (item): SiteCvEducation | undefined =>
      isObject(item) && (text(item.school) || text(item.degree))
        ? {
            school: text(item.school) ?? "",
            degree: text(item.degree) ?? "",
            from: period(item.from),
            to: period(item.to),
          }
        : undefined,
    ),
    certifications: list(raw.certifications, text),
    languages: list(raw.languages, text),
    skills: list(raw.skills, text),
  };
}

function list<T>(value: unknown, parse: (item: unknown) => T | undefined): T[] {
  const items: T[] = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const parsed = parse(item);

      if (parsed !== undefined) {
        items.push(parsed);
      }
    });
  }

  return items;
}

/** «2020», «2020-03» or «nå», as Next writes it. Anything else is left empty */
function period(value: unknown): string {
  return typeof value === "string" && /^(\d{4}(-(0[1-9]|1[0-2]))?|nå)$/.test(value.trim()) ? value.trim() : "";
}

function parseJson(body: string | null | undefined): unknown {
  try {
    return JSON.parse(body ?? "");
  } catch (_e) {
    return undefined;
  }
}

/** One part of the submission: a text value, or the CV as a stream */
export type ApplyPart =
  | { name: string; value: string }
  | { name: string; value: ByteSource; fileName: string; contentType: string };

/**
 * - `received`: 202. Also for a repeated application, or when the bot check
 *   in Next caught it; the answer never says whether anything was written
 * - `invalid`: 400 with the field that is missing or wrong
 * - `closed`: 404, the position takes no applications from here any more
 * - `tooLarge`: 413
 * - `tooMany`: 429
 * - `failed`: anything else, also network errors and a missing configuration
 */
export type SubmitResult =
  | { status: "received" }
  | { status: "invalid"; field: SiteApplyFieldKey | "name" | "email" | `cf.${string}`; error: string }
  | { status: "closed" }
  | { status: "tooLarge" }
  | { status: "tooMany" }
  | { status: "failed" };

/**
 * Sends the application to Next once. No retries: a second try could send the
 * application twice, and the candidate is waiting
 */
export function submitApplication(
  siteKey: string,
  positionId: string,
  parts: ApplyPart[],
  applicantAddress: string,
): SubmitResult {
  const config = getConfig(siteKey);

  if (!config) {
    log.warning("next-apply: not sent, the address of Next or the API key is missing (position=%s)", positionId);
    return { status: "failed" };
  }

  let response;

  try {
    response = request({
      url: `${config.baseUrl}/api/nettside/v1/stillinger/${encodeURIComponent(positionId)}/soknad`,
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + config.apiKey,
        "X-Applicant-Address": applicantAddress,
      },
      multipart: parts,
      connectionTimeout: SUBMIT_TIMEOUT_MS,
      readTimeout: SUBMIT_TIMEOUT_MS,
      followRedirects: false,
    });
  } catch (e) {
    // The message is about the connection. It never holds the headers or the body
    log.warning("next-apply: the submission failed (position=%s): %s", positionId, errorMessage(e));
    return { status: "failed" };
  }

  // Only the status and the position. Never the fields, the file or the address
  log.info("next-apply: the submission answered %s (position=%s)", response.status, positionId);

  switch (response.status) {
    case 202:
    case 200:
      return { status: "received" };
    case 400:
      return getInvalid(response.body);
    case 401:
      log.error("next-apply: the submission answered 401, check the API key");
      return { status: "failed" };
    case 404:
      return { status: "closed" };
    case 413:
      return { status: "tooLarge" };
    case 429:
      return { status: "tooMany" };
    default:
      return { status: "failed" };
  }
}

/** A 400 without a field we know is about the request, not the candidate: e.g. a missing address */
function getInvalid(body: string | null): SubmitResult {
  let json: unknown;

  try {
    json = JSON.parse(body ?? "");
  } catch (_e) {
    json = undefined;
  }

  const field = isObject(json) ? json.field : undefined;
  const error = isObject(json) ? text(json.error) : undefined;

  if (field === "name" || field === "email" || isFieldKey(field) || isCustomFieldName(field)) {
    return { status: "invalid", field, error: error ?? "" };
  }

  log.error("next-apply: the submission answered 400 without a field: %s", error ?? "unknown");
  return { status: "failed" };
}

function errorMessage(e: unknown): string {
  return (e as { message?: string })?.message ?? "unknown";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Escaping doesn't stop a `javascript:` link, so only https addresses are used */
function httpsUrl(value: unknown): string | undefined {
  return typeof value === "string" && /^https:\/\/[^\s"'<>]+$/.test(value) ? value : undefined;
}
