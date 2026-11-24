import { run } from "/lib/xp/context";
import { connect, type AccessControlEntry } from "/lib/xp/node";
import { create as createRepo, delete as deleteRepo, get as getRepo } from "/lib/xp/repo";
import { cleanDesign, type CareerDesign } from "./design";
import { listSites, normalizeSiteKey } from "./site";

/* ============================================================================
 * The settings of the admin tool, one set for each site.
 *
 * They live in a repository of their own, in one node for each site, so every
 * node in a cluster sees the same values and nothing is published as content.
 * Only the app reads and writes it, as system.admin: the tool decides who may
 * change the settings.
 *
 * The API key of Next can be here too, pasted into the tool. It is a secret,
 * so it is kept apart from the other settings: it never follows them into a
 * view or a log, and only the client that calls Next asks for it. Stored
 * here, it is part of dumps and exports of this repository. The key in the
 * app's .cfg file is not.
 * ========================================================================== */

/** Named after the app and the library, so it isn't taken for a repository of the app's own */
const REPO_ID = `${app.name}.next-jobs`;
const BRANCH = "master";

/** What the repository was called before. A name that plain could be another's too */
const OLD_REPO_ID = `${app.name}.settings`;

/** The one node the settings were in before they were stored for each site */
const LEGACY_NAME = "career";
const LEGACY_PATH = `/${LEGACY_NAME}`;

/** More nodes than this were never in the old repository: one for each site with the app */
const MAX_OLD_NODES = 1000;

/** How long a node keeps the settings before reading again: a change made on another node shows within this */
const CACHE_MS = 30 * 1000;

/** More cards than this is a typing error, not a wish */
export const MAX_POSITIONS_LIMIT = 50;

/** The lists of ids keep ids Next no longer sends, so they have an upper limit: the oldest go first */
const HIDDEN_LIMIT = 500;
const ID_MAX_LENGTH = 200;

/** Only the app gets in, as system.admin. Said outright, since the node can hold the API key */
const ADMIN_ONLY: AccessControlEntry[] = [
  {
    principal: "role:system.admin",
    allow: ["READ", "CREATE", "MODIFY", "DELETE", "PUBLISH", "READ_PERMISSIONS", "WRITE_PERMISSIONS"],
  },
];

/** Set on the root and on the node itself, so neither takes its permissions from anywhere else */
const CLOSED = { _permissions: ADMIN_ONLY, _inheritsPermissions: false };

export type CareerSettings = {
  /** The address of Next, https and without a trailing slash. Without it, `nextJobs.baseUrl` in the .cfg file is used */
  baseUrl?: string;
  /** How many positions the list shows at most, newest first. Without it, all of them */
  maxPositions?: number;
  /**
   * The ids of positions that are not shown on the site at all. A position
   * Next publishes later is not in it, and so is shown until someone hides it
   */
  hiddenPositions?: string[];
  /**
   * The ids of the positions in the order the site shows them. Without it:
   * newest first, as Next sends them. A position that isn't in it, such as a
   * new one, comes before those that are
   */
  positionOrder?: string[];
  /** The page chosen as the career page, as `<project>:<content id>`. Without it, the tool finds one itself */
  careerPage?: string;
  /** The switches that are saved. One that is left out has its default */
  display?: Partial<CareerDisplay>;
  /** The colors and corners the site has set. What is left out follows the site's own look */
  design?: CareerDesign;
  /** The texts above the list that the site has set. What is left out is as the page itself has it */
  texts?: CareerTexts;
};

/**
 * What stands above the list of positions, for every page of the site with
 * the list. A value that is left out is the page's own: what the app's view
 * has, or what an editor has set on the component
 */
export type CareerTexts = {
  /** The heading of the list */
  title?: string;
  /** The text under the heading. Plain text, line breaks are kept */
  text?: string;
  /** The number of positions as the first line under the heading */
  showCount?: boolean;
};

/** A heading longer than this is a text, and belongs in the text */
export const TITLE_MAX_LENGTH = 120;

/** The text is an introduction to the list, not an article */
export const TEXT_MAX_LENGTH = 600;

/**
 * What the site shows of what Next sends, for every page with the job blocks.
 * The first three were switches on the components in Content Studio before
 */
export type CareerDisplay = {
  /** The deadline on the cards in the list. The posting always shows it */
  deadline: boolean;
  /** The banner from Next at the top of the posting */
  banner: boolean;
  /** The step above the application form that reads the CV. Next must have it on as well */
  cvRead: boolean;
  /** «Det er en fordel om du har» on the posting */
  niceToHave: boolean;
  /** The contact person on the posting */
  contact: boolean;
  /** The link to the page about the position (readMoreUrl) on the posting */
  article: boolean;
};

/** The names of the switches, in the order the admin tool lists them */
export const DISPLAY_KEYS: (keyof CareerDisplay)[] = [
  "deadline",
  "banner",
  "niceToHave",
  "contact",
  "article",
  "cvRead",
];

/** What applies until someone saves the switches: what the site showed before they came */
const DISPLAY_DEFAULTS: CareerDisplay = {
  deadline: true,
  banner: true,
  cvRead: true,
  niceToHave: false,
  contact: false,
  article: false,
};

/** The node as it is read. One value in a list comes back as the value alone, and anyone can have changed the node */
type StoredSettings = {
  baseUrl?: unknown;
  maxPositions?: unknown;
  hiddenPositions?: unknown;
  positionOrder?: unknown;
  careerPage?: unknown;
  display?: unknown;
  design?: unknown;
  texts?: unknown;
  apiKey?: unknown;
};

/** What the node holds: the settings, and the API key beside them */
type StoredNode = CareerSettings & { apiKey?: string };

type Cache = {
  settings: CareerSettings;
  /** The API key pasted into the tool. Never part of `settings` */
  apiKey?: string;
  /** Epoch millis. Until then, `settings` is reused without reading the node */
  readAgainAt: number;
};

// By site key. Shared by every request on this node. Replaced as a whole, never changed in place
let caches: Record<string, Cache> = {};

/**
 * Makes the repository on app start, and closes it to everyone but the app.
 * On a cluster another node can get there first, which is fine
 */
export function initCareerSettings(): void {
  try {
    asAdmin(() => {
      if (!getRepo(REPO_ID)) {
        createRepo({ id: REPO_ID, rootPermissions: ADMIN_ONLY });
        log.info("next-jobs-settings: created the repository %s", REPO_ID);
      }

      closeToOthers();
    });
  } catch (e) {
    log.error("next-jobs-settings: could not make the repository: %s", String(e));
  }

  adoptOldRepository();
  adoptLegacySettings();
}

/**
 * The settings were in a repository named `<app>.settings` before. Each node
 * of settings is moved here, the key included: copied, read back, and only
 * then removed from the old place, so a move that goes wrong leaves it where
 * it was for the next app start. The old repository is removed when nothing
 * is left in it; anything in it that isn't ours stays, with the repository
 */
function adoptOldRepository(): void {
  try {
    asAdmin(() => {
      if (!getRepo(OLD_REPO_ID)) {
        return;
      }

      const old = connect({ repoId: OLD_REPO_ID, branch: BRANCH });
      const repo = connect({ repoId: REPO_ID, branch: BRANCH });
      let moved = 0;

      old.findChildren({ parentKey: "/", count: MAX_OLD_NODES }).hits.forEach((hit) => {
        const node = old.get<StoredSettings & { _name?: string }>(hit.id);
        const name = node?._name ?? "";

        if (!node || !isSettingsNode(name)) {
          return;
        }

        const apiKey = normalizeApiKey(typeof node.apiKey === "string" ? node.apiKey : undefined);

        // A node that is here already is the newer one, and the old one is only removed
        if (!repo.exists(`/${name}`)) {
          repo.create<StoredNode>({
            _name: name,
            _parentPath: "/",
            ...CLOSED,
            ...cleanSettings(node),
            ...(apiKey ? { apiKey } : {}),
          });

          // The copy is looked up by its path, which is found through the index
          repo.refresh();

          const copy = repo.get<StoredSettings>(`/${name}`);

          if (!copy || (apiKey !== undefined && copy.apiKey !== apiKey)) {
            throw new Error("A node of settings was not copied whole, so it is left in the old repository");
          }
        }

        old.delete(hit.id);
        moved++;
      });

      old.refresh();

      const left = old.findChildren({ parentKey: "/", count: 0 }).total;

      if (left === 0) {
        deleteRepo(OLD_REPO_ID);
      }

      caches = {};
      log.info(
        "next-jobs-settings: moved the settings of %s sites from the repository %s, which was %s",
        String(moved),
        OLD_REPO_ID,
        left === 0 ? "removed" : "kept, since it holds something else",
      );
    });
  } catch (e) {
    log.error("next-jobs-settings: could not move the settings from the repository %s: %s", OLD_REPO_ID, String(e));
  }
}

/** A node of ours in the old repository: the one from before each site had its own, or one named after a site */
function isSettingsNode(name: string): boolean {
  return name === LEGACY_NAME || normalizeSiteKey(name.replace("__", ":")) !== undefined;
}

/**
 * XP's own defaults let every logged-in user read the repository, and the
 * nodes in it can hold the API key. A repository made before the key could be
 * stored has those defaults. The nodes are made closed, and closed again on
 * every save
 */
function closeToOthers(): void {
  const repo = connect({ repoId: REPO_ID, branch: BRANCH });

  if (!isAdminOnly(repo.get("/")?._permissions)) {
    repo.setRootPermissions(CLOSED);
    log.info("next-jobs-settings: closed the repository to others than system.admin");
  }
}

function isAdminOnly(permissions: AccessControlEntry[] | undefined): boolean {
  return !!permissions && permissions.length === 1 && permissions[0].principal === ADMIN_ONLY[0].principal;
}

/**
 * The settings were one set for the whole instance before, and applied to
 * every site with the app. Each of those sites gets a copy, the key included,
 * so nothing changes for them, and the old node is removed. With no site yet
 * the node is left for the next try: on app start, and when the tool is opened
 */
export function adoptLegacySettings(): void {
  try {
    asAdmin(() => {
      const repo = connect({ repoId: REPO_ID, branch: BRANCH });
      const legacy = repo.get<StoredSettings>(LEGACY_PATH);

      if (!legacy) {
        return;
      }

      const sites = listSites();

      if (sites.length === 0) {
        return;
      }

      const settings = cleanSettings(legacy);
      const apiKey = normalizeApiKey(typeof legacy.apiKey === "string" ? legacy.apiKey : undefined);
      let adopted = 0;

      sites.forEach((site) => {
        if (!repo.exists(nodePath(site.key))) {
          createNode(repo, site.key, settings, apiKey);
          adopted++;
        }
      });

      repo.delete(LEGACY_PATH);
      caches = {};
      log.info(
        "next-jobs-settings: moved the settings from before to %s of %s sites",
        String(adopted),
        String(sites.length),
      );
    });
  } catch (e) {
    log.error("next-jobs-settings: could not move the settings from before: %s", String(e));
  }
}

/** The settings of a site. Without a site, or before anything is saved for it: empty, so the defaults apply */
export function getCareerSettings(siteKey: string): CareerSettings {
  return read(siteKey).settings;
}

/**
 * The API key pasted into the admin tool for the site, when there is one. It
 * is for the `Authorization` header of the calls to Next and nothing else:
 * never pass it to a view, a log or a redirect
 */
export function getStoredApiKey(siteKey: string): string | undefined {
  return read(siteKey).apiKey;
}

function read(siteKey: string): Cache {
  const now = Date.now();
  const cached = caches[siteKey];

  if (cached && now < cached.readAgainAt) {
    return cached;
  }

  const fresh: Cache = { ...readNode(siteKey), readAgainAt: now + CACHE_MS };

  caches = { ...caches, [siteKey]: fresh };

  return fresh;
}

/** The texts above the list that the site has set. Empty when it has set none */
export function getCareerTexts(siteKey: string): CareerTexts {
  return getCareerSettings(siteKey).texts ?? {};
}

/** The colors and corners the site has set. Empty when it has set none */
export function getCareerDesign(siteKey: string): CareerDesign {
  return getCareerSettings(siteKey).design ?? {};
}

/** Every switch of the site, with the default for those that aren't saved */
export function getCareerDisplay(siteKey: string): CareerDisplay {
  const saved = getCareerSettings(siteKey).display ?? {};
  const display = { ...DISPLAY_DEFAULTS };

  DISPLAY_KEYS.forEach((key) => {
    const value = saved[key];

    if (value !== undefined) {
      display[key] = value;
    }
  });

  return display;
}

/**
 * Changes the settings of a site. `change` gets what is stored now, read
 * inside the call and not from this node's memory, and returns what to store.
 * A value that is left out is removed, and the default is used again.
 *
 * The API key is changed only when `apiKey` is given: a key replaces the one
 * that is stored, and `null` removes it. It is saved in the same write as the
 * settings, so a new address and its key start to apply together
 */
export function saveCareerSettings(
  siteKey: string,
  change: (stored: CareerSettings) => CareerSettings,
  apiKey?: string | null,
): void {
  const newKey = typeof apiKey === "string" ? normalizeApiKey(apiKey) : undefined;

  if (typeof apiKey === "string" && !newKey) {
    throw new Error("The API key is not a valid key");
  }

  if (!normalizeSiteKey(siteKey)) {
    throw new Error("The settings belong to a site, and no site is given");
  }

  asAdmin(() => {
    const repo = connect({ repoId: REPO_ID, branch: BRANCH });
    const path = nodePath(siteKey);
    const data = cleanSettings(change(cleanSettings(repo.get<StoredSettings>(path))));

    if (repo.exists(path)) {
      repo.modify<StoredNode>({
        key: path,
        editor: (node) => {
          delete node.baseUrl;
          delete node.maxPositions;
          delete node.hiddenPositions;
          delete node.positionOrder;
          delete node.careerPage;
          delete node.display;
          delete node.design;
          delete node.texts;

          if (apiKey !== undefined) {
            delete node.apiKey;
          }

          // The permissions are set on every save too, so a key never lands in a node that others can read
          return { ...node, ...data, ...(newKey ? { apiKey: newKey } : {}), ...CLOSED };
        },
      });
    } else {
      createNode(repo, siteKey, data, newKey);
    }
  });

  const { [siteKey]: _saved, ...others } = caches;

  caches = others;
}

/** The node of a site is named after its key, with the colon written as two underscores to keep the name plain */
function nodeName(siteKey: string): string {
  return siteKey.replace(":", "__");
}

function nodePath(siteKey: string): string {
  return `/${nodeName(siteKey)}`;
}

function createNode(
  repo: ReturnType<typeof connect>,
  siteKey: string,
  settings: CareerSettings,
  apiKey: string | undefined,
): void {
  repo.create<StoredNode>({
    _name: nodeName(siteKey),
    _parentPath: "/",
    ...CLOSED,
    ...settings,
    ...(apiKey ? { apiKey } : {}),
  });
}

/**
 * The address as it is stored and used: https, a host name and maybe a port,
 * nothing more. Undefined for anything else. Calls to Next carry the API key,
 * so an address with a path, a query or user info is turned down
 */
export function normalizeBaseUrl(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");

  return /^https:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

/**
 * The key as it is stored and sent: the characters a bearer token can have
 * (RFC 6750), so nothing pasted with it, such as a line break, gets into the
 * header. «Bearer » in front is dropped, since the client adds it. Undefined
 * for anything else
 */
export function normalizeApiKey(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim().replace(/^Bearer\s+/i, "");

  return /^[A-Za-z0-9._~+/-]{8,512}={0,2}$/.test(trimmed) ? trimmed : undefined;
}

/** A heading on one line, within the limit. Undefined when it is empty or too long */
export function normalizeTitle(value: unknown): string | undefined {
  const title = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  return title !== "" && title.length <= TITLE_MAX_LENGTH ? title : undefined;
}

/** A text with its line breaks, within the limit. Undefined when it is empty or too long */
export function normalizeText(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";

  return text !== "" && text.length <= TEXT_MAX_LENGTH ? text : undefined;
}

/** A whole number from 1 to the limit, as a number or as typed in the form. Otherwise undefined */
export function normalizeMaxPositions(value: number | string | undefined): number | undefined {
  const number = typeof value === "number" ? value : /^\d{1,3}$/.test((value ?? "").trim()) ? Number(value) : NaN;

  return number >= 1 && number <= MAX_POSITIONS_LIMIT && Math.floor(number) === number ? number : undefined;
}

/** `<project>:<content id>`, both of letters, digits, _ and -. Otherwise undefined */
export function normalizeCareerPage(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();

  return /^[\w-]{1,100}:[\w-]{1,100}$/.test(trimmed) ? trimmed : undefined;
}

/** The ids as a list without repeats and empty values. Longer than the limit, the first (oldest) are dropped */
export function normalizeIds(value: unknown): string[] {
  const list: unknown[] = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  const ids: string[] = [];

  list.forEach((item) => {
    const id = typeof item === "string" ? item.trim() : "";

    if (id !== "" && id.length <= ID_MAX_LENGTH && ids.indexOf(id) === -1) {
      ids.push(id);
    }
  });

  return ids.slice(-HIDDEN_LIMIT);
}

function readNode(siteKey: string): { settings: CareerSettings; apiKey?: string } {
  // No site, as in a request outside one: nothing is stored for it
  if (!normalizeSiteKey(siteKey)) {
    return { settings: {} };
  }

  try {
    return asAdmin(() => {
      const raw = connect({ repoId: REPO_ID, branch: BRANCH }).get<StoredSettings>(nodePath(siteKey));

      return {
        settings: cleanSettings(raw),
        apiKey: normalizeApiKey(typeof raw?.apiKey === "string" ? raw.apiKey : undefined),
      };
    });
  } catch (e) {
    // Without the repository the site still works, with the values from the .cfg file
    log.warning("next-jobs-settings: could not read the settings: %s", String(e));
    return { settings: {} };
  }
}

/** Only values that are still valid, so a node changed by hand can't put something else into the calls */
function cleanSettings(raw: StoredSettings | null | undefined): CareerSettings {
  const settings: CareerSettings = {};
  const baseUrl = normalizeBaseUrl(typeof raw?.baseUrl === "string" ? raw.baseUrl : undefined);
  const maxPositions = normalizeMaxPositions(
    typeof raw?.maxPositions === "number" || typeof raw?.maxPositions === "string" ? raw.maxPositions : undefined,
  );
  const hiddenPositions = normalizeIds(raw?.hiddenPositions);

  if (baseUrl) {
    settings.baseUrl = baseUrl;
  }

  if (maxPositions) {
    settings.maxPositions = maxPositions;
  }

  if (hiddenPositions.length > 0) {
    settings.hiddenPositions = hiddenPositions;
  }

  const positionOrder = normalizeIds(raw?.positionOrder);

  if (positionOrder.length > 0) {
    settings.positionOrder = positionOrder;
  }

  const careerPage = normalizeCareerPage(typeof raw?.careerPage === "string" ? raw.careerPage : undefined);

  if (careerPage) {
    settings.careerPage = careerPage;
  }

  const display = cleanDisplay(raw?.display);

  if (display) {
    settings.display = display;
  }

  const design = cleanDesign(raw?.design);

  if (design) {
    settings.design = design;
  }

  const texts = cleanTexts(raw?.texts);

  if (texts) {
    settings.texts = texts;
  }

  return settings;
}

/** Only the known texts, each within its limit. Undefined when none is left */
function cleanTexts(raw: unknown): CareerTexts | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const values = raw as Record<string, unknown>;
  const texts: CareerTexts = {};
  const title = normalizeTitle(values.title);
  const text = normalizeText(values.text);

  if (title) {
    texts.title = title;
  }

  if (text) {
    texts.text = text;
  }

  if (typeof values.showCount === "boolean") {
    texts.showCount = values.showCount;
  }

  return Object.keys(texts).length > 0 ? texts : undefined;
}

/** Only the known switches, and only real booleans */
function cleanDisplay(raw: unknown): Partial<CareerDisplay> | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const display: Partial<CareerDisplay> = {};
  let any = false;

  DISPLAY_KEYS.forEach((key) => {
    const value = (raw as Record<string, unknown>)[key];

    if (typeof value === "boolean") {
      display[key] = value;
      any = true;
    }
  });

  return any ? display : undefined;
}

function asAdmin<T>(callback: () => T): T {
  return run({ repository: REPO_ID, branch: BRANCH, principals: ["role:system.admin"] }, callback);
}
