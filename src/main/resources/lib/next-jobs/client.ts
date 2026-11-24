import { request } from "/lib/http-client";
import { LocalDate, ZoneId } from "/lib/time";
import { getCareerSettings, getStoredApiKey } from "./settings";
import type { SiteContact, SitePosition, SiteRichBlock, SiteRichRun, SiteRichText } from "./types";

/* ============================================================================
 * Reads the published positions from the job API in Next.
 *
 * The API key never leaves the server: the API sends no CORS headers on
 * purpose, so the browser can't call it. Every call is for a site: the address
 * and the key come from what the admin tool has stored for that site, or from
 * the .cfg file for what the tool doesn't have.
 *
 * The list of a site is kept in memory for a minute, so visits don't turn into calls
 * (the API allows 300 calls per sender per 15 minutes). When a call fails,
 * the last good list is shown. There are no retries inside a request, since
 * a visitor would wait for them; the next attempt comes after the pause.
 * ========================================================================== */

const PATH = "/api/nettside/v1/stillinger";
const CONNECTION_TIMEOUT_MS = 5000;
const READ_TIMEOUT_MS = 10000;
/** How long a list is used before asking Next again. Matches `max-age=60` from the API */
const FRESH_MS = 60 * 1000;
/** The API doesn't send Retry-After, so wait longer after "too many calls" */
const RATE_LIMITED_MS = 5 * 60 * 1000;
const OSLO = ZoneId.of("Europe/Oslo");

/**
 * - `ok`: a fresh list from Next
 * - `stale`: Next failed, this is the last good list
 * - `unavailable`: Next failed and no list is known
 * - `disabled`: the feature is turned off in Next (404)
 * - `unconfigured`: the address or the key is set neither in the admin tool nor in the .cfg file
 */
export type JobListStatus = "ok" | "stale" | "unavailable" | "disabled" | "unconfigured";

export type JobList = {
  status: JobListStatus;
  /** Newest first, without positions whose deadline has passed */
  positions: SitePosition[];
};

type State = {
  result: JobList;
  lastGood: SitePosition[] | null;
  /** Epoch millis. Until then, `result` is reused without calling Next */
  nextAttemptAt: number;
};

function emptyState(): State {
  return {
    result: { status: "unavailable", positions: [] },
    lastGood: null,
    nextAttemptAt: 0,
  };
}

/*
 * By site key: two sites can be two tenants in Next. Shared by every request
 * on this node. Replaced as a whole, never changed in place. The keys come
 * from the sites that exist, so it can't grow from made-up values
 */
let states: Record<string, State> = {};

function getState(siteKey: string): State {
  return states[siteKey] ?? emptyState();
}

function setState(siteKey: string, state: State): State {
  states = { ...states, [siteKey]: state };

  return state;
}

/**
 * Forgets the list of a site, so the next visit asks Next again. Used when
 * the address or the key is changed: the last good list is from the old ones.
 * Other nodes in a cluster keep theirs until the minute is over
 */
export function resetPositions(siteKey: string): void {
  setState(siteKey, emptyState());
}

/**
 * The positions the site shows: what Next publishes, without those hidden in
 * the admin tool. A hidden position is gone from the site as a whole: the
 * list, its own posting and the application
 */
export function getPositions(siteKey: string): JobList {
  const list = getAllPositions(siteKey);
  const settings = getCareerSettings(siteKey);
  const hidden = settings.hiddenPositions ?? [];
  const visible =
    hidden.length > 0 ? list.positions.filter((position) => hidden.indexOf(position.id) === -1) : list.positions;
  const positions = orderPositions(visible, settings.positionOrder ?? []);

  return positions === list.positions ? list : { status: list.status, positions };
}

/**
 * The positions in the order set in the admin tool. Those that aren't in the
 * order, such as a new position from Next, come first and keep their own
 * order (newest first), so a new position is seen until someone places it
 */
export function orderPositions(positions: SitePosition[], order: string[]): SitePosition[] {
  if (order.length === 0) {
    return positions;
  }

  const unplaced = positions.filter((position) => order.indexOf(position.id) === -1);
  const placed = positions
    .filter((position) => order.indexOf(position.id) !== -1)
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return unplaced.concat(placed);
}

/** How the calls to Next for a site have gone on this node since the app started. For the admin tool */
export type FetchHealth = {
  /** Epoch millis of the last call that gave a list */
  lastOkAt?: number;
  /** The last call that didn't: when, and the HTTP status (0 when there was no answer) */
  lastError?: { at: number; code: number };
};

// By site key. Replaced as a whole, never changed in place. Not forgotten with the list: it is a record of what happened
let healths: Record<string, FetchHealth> = {};

export function getFetchHealth(siteKey: string): FetchHealth {
  return healths[siteKey] ?? {};
}

/** Everything Next publishes, also what is hidden on the site. For the admin tool, which chooses among them */
export function getAllPositions(siteKey: string): JobList {
  const now = Date.now();
  const state = getState(siteKey);

  if (now < state.nextAttemptAt) {
    return withoutExpired(state.result);
  }

  const config = getConfig(siteKey);

  if (!config) {
    log.warning("next-jobs: the address of Next or the API key is missing");

    return setState(siteKey, {
      result: { status: "unconfigured", positions: [] },
      lastGood: null,
      nextAttemptAt: now + FRESH_MS,
    }).result;
  }

  // Claim the next minute before calling, so visits arriving meanwhile reuse the current list
  setState(siteKey, { result: state.result, lastGood: state.lastGood, nextAttemptAt: now + FRESH_MS });

  return withoutExpired(setState(siteKey, fetchState(siteKey, config, state.lastGood, now)).result);
}

export type Config = {
  baseUrl: string;
  apiKey: string;
};

/** Where the address of Next comes from: the admin tool, the .cfg file, or nowhere */
export type BaseUrlSource = "admin" | "cfg" | "none";

/** The address in use for the site and where it is set. The admin tool wins over the .cfg file */
export function getBaseUrl(siteKey: string): { baseUrl: string; source: BaseUrlSource } {
  const fromAdmin = getCareerSettings(siteKey).baseUrl;

  if (fromAdmin) {
    return { baseUrl: fromAdmin, source: "admin" };
  }

  const fromCfg = getCfgBaseUrl();

  return { baseUrl: fromCfg, source: fromCfg ? "cfg" : "none" };
}

/** The address in the .cfg file, used by every site the admin tool has none for. Empty when it isn't set */
export function getCfgBaseUrl(): string {
  return (app.config["nextJobs.baseUrl"] ?? "").trim().replace(/\/+$/, "");
}

/** Where the API key comes from: the admin tool, the .cfg file, or nowhere */
export type ApiKeySource = "admin" | "cfg" | "none";

/** Where the key in use is set. The admin tool shows this, never the key */
export function getApiKeySource(siteKey: string): ApiKeySource {
  return getApiKey(siteKey).source;
}

/** The key in use and where it is set. The admin tool wins over the .cfg file, as for the address */
function getApiKey(siteKey: string): { apiKey: string; source: ApiKeySource } {
  const fromAdmin = getStoredApiKey(siteKey);

  if (fromAdmin) {
    return { apiKey: fromAdmin, source: "admin" };
  }

  const fromCfg = (app.config["nextJobs.apiKey"] ?? "").trim();

  return { apiKey: fromCfg, source: fromCfg ? "cfg" : "none" };
}

/** The address and the key of the site. Undefined when one is missing or the address isn't https */
export function getConfig(siteKey: string): Config | undefined {
  const baseUrl = getBaseUrl(siteKey).baseUrl;
  const apiKey = getApiKey(siteKey).apiKey;

  if (!baseUrl || !apiKey) {
    return undefined;
  }

  if (!/^https:\/\//.test(baseUrl)) {
    log.error("next-jobs: the address of Next must start with https://");
    return undefined;
  }

  return { baseUrl, apiKey };
}

function fetchState(siteKey: string, config: Config, lastGood: SitePosition[] | null, now: number): State {
  const status = fetchList(config);
  const health = getFetchHealth(siteKey);

  healths = {
    ...healths,
    [siteKey]: status.positions
      ? { lastOkAt: now, lastError: health.lastError }
      : { lastOkAt: health.lastOkAt, lastError: { at: now, code: status.code } },
  };

  if (status.positions) {
    return {
      result: { status: "ok", positions: status.positions },
      lastGood: status.positions,
      nextAttemptAt: now + FRESH_MS,
    };
  }

  // The feature is turned off in Next: the positions are taken down on purpose, so forget them too
  if (status.code === 404) {
    log.info("next-jobs: the job API answered 404, the feature is turned off in Next");
    return {
      result: { status: "disabled", positions: [] },
      lastGood: null,
      nextAttemptAt: now + FRESH_MS,
    };
  }

  return {
    result: lastGood ? { status: "stale", positions: lastGood } : { status: "unavailable", positions: [] },
    lastGood,
    nextAttemptAt: now + (status.code === 429 ? RATE_LIMITED_MS : FRESH_MS),
  };
}

type FetchStatus = {
  /** The HTTP status, or 0 when the call failed before an answer */
  code: number;
  /** Only set on a usable answer */
  positions?: SitePosition[];
};

function fetchList(config: Config): FetchStatus {
  let response;

  try {
    response = request({
      url: config.baseUrl + PATH,
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + config.apiKey,
      },
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      readTimeout: READ_TIMEOUT_MS,
      // A redirect could drop the key or send it on to another host: treat it as an error
      followRedirects: false,
    });
  } catch (e) {
    // The message says what went wrong with the connection. It never holds the headers
    log.warning("next-jobs: the call to the job API failed: %s", (e as { message?: string })?.message ?? "unknown");
    return { code: 0 };
  }

  if (response.status !== 200) {
    if (response.status === 401) {
      log.error("next-jobs: the job API answered 401, check the API key");
    } else if (response.status >= 300 && response.status < 400) {
      log.error("next-jobs: the job API answered %s, check that the address of Next has no www", response.status);
    } else if (response.status !== 404) {
      log.warning("next-jobs: the job API answered %s", response.status);
    }

    return { code: response.status };
  }

  const positions = parsePositions(response.body);

  if (!positions) {
    log.error("next-jobs: the job API answered 200 with a body that isn't a position list");
    return { code: response.status };
  }

  return { code: response.status, positions: sortNewestFirst(positions) };
}

/**
 * Keeps only what the page can use. The types promise more than the code
 * relies on: a position without id, title or application link is left out
 */
export function parsePositions(body: string | null | undefined): SitePosition[] | undefined {
  let json: unknown;

  try {
    json = JSON.parse(body ?? "");
  } catch (_e) {
    return undefined;
  }

  const list = isObject(json) ? json.positions : undefined;

  if (!Array.isArray(list)) {
    return undefined;
  }

  const positions: SitePosition[] = [];

  for (let i = 0; i < list.length; i++) {
    const position = parsePosition(list[i]);

    if (position) {
      positions.push(position);
    }
  }

  return positions;
}

function parsePosition(raw: unknown): SitePosition | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const id = text(raw.id);
  const title = text(raw.title);
  const applyUrl = httpsUrl(raw.applyUrl);

  if (!id || !title || !applyUrl) {
    log.warning("next-jobs: left out a position without id, title or https application link (id=%s)", id ?? "?");
    return undefined;
  }

  return {
    id,
    title,
    applyUrl,
    unit: text(raw.unit) ?? "",
    datePosted: isoDate(raw.datePosted) ?? "",
    location: text(raw.location),
    employmentType: text(raw.employmentType),
    summary: text(raw.summary),
    deadline: isoDate(raw.deadline),
    imageUrl: httpsUrl(raw.imageUrl),
    imageInCard: raw.imageInCard === true,
    bannerUrl: httpsUrl(raw.bannerUrl),
    readMoreUrl: httpsUrl(raw.readMoreUrl),
    description: text(raw.description),
    descriptionRich: parseRichText(raw.descriptionRich),
    requirements: texts(raw.requirements),
    niceToHave: texts(raw.niceToHave),
    responsibilities: texts(raw.responsibilities),
    contact: parseContact(raw.contact),
  };
}

/**
 * The formatted description, with only the kinds of blocks this version knows:
 * a newer format from Next loses what is new, not the rest. Empty pieces,
 * items and blocks are left out, so the view never draws an empty paragraph
 */
function parseRichText(raw: unknown): SiteRichText | undefined {
  if (!isObject(raw) || !Array.isArray(raw.blocks)) {
    return undefined;
  }

  const blocks: SiteRichBlock[] = [];

  raw.blocks.forEach((block: unknown) => {
    if (!isObject(block)) {
      return;
    }

    if (block.type === "p") {
      const runs = parseRuns(block.runs);

      if (runs.length > 0) {
        blocks.push({ type: "p", runs });
      }
    } else if ((block.type === "ul" || block.type === "ol") && Array.isArray(block.items)) {
      const items = block.items.map(parseRuns).filter((runs) => runs.length > 0);

      if (items.length > 0) {
        blocks.push({ type: block.type, items });
      }
    }
  });

  return blocks.length > 0 ? { v: 1, blocks } : undefined;
}

function parseRuns(raw: unknown): SiteRichRun[] {
  const runs: SiteRichRun[] = [];

  (Array.isArray(raw) ? raw : []).forEach((run: unknown) => {
    if (isObject(run) && typeof run.text === "string" && run.text !== "") {
      runs.push({
        text: run.text,
        ...(run.bold === true ? { bold: true as const } : {}),
        ...(run.italic === true ? { italic: true as const } : {}),
      });
    }
  });

  return runs;
}

function parseContact(raw: unknown): SiteContact | undefined {
  const name = isObject(raw) ? text(raw.name) : undefined;

  if (!isObject(raw) || !name) {
    return undefined;
  }

  return {
    name,
    title: text(raw.title),
    email: text(raw.email),
    phone: text(raw.phone),
  };
}

function sortNewestFirst(positions: SitePosition[]): SitePosition[] {
  return positions.slice().sort((a, b) => {
    if (a.datePosted !== b.datePosted) {
      return a.datePosted < b.datePosted ? 1 : -1;
    }

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Next only sends positions with a deadline left, but the last good list can
 * be older than today. The deadline day itself still counts
 */
function withoutExpired(result: JobList): JobList {
  const today = LocalDate.now(OSLO).toString();
  const positions = result.positions.filter((position) => !position.deadline || position.deadline >= today);

  return positions.length === result.positions.length ? result : { status: result.status, positions };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => text(item) !== undefined) : [];
}

function isoDate(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/** Escaping doesn't stop a `javascript:` link, so only https addresses are used */
function httpsUrl(value: unknown): string | undefined {
  return typeof value === "string" && /^https:\/\/[^\s"'<>]+$/.test(value) ? value : undefined;
}
