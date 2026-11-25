import { get as getContext, run } from "/lib/xp/context";
import { localize } from "/lib/xp/i18n";
import { assetUrl } from "/lib/enonic/asset";
import { render } from "/lib/freemarker";
import { formatDate as formatInstant } from "/lib/time";
import { canSetConnection, canUseTool } from "./access";
import { findCareerPages, pickCareerPage, type CareerPage } from "../career-page";
import {
  DISPLAY_KEYS,
  MAX_POSITIONS_LIMIT,
  TEXT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  adoptLegacySettings,
  getCareerDesign,
  getCareerDisplay,
  getCareerSettings,
  getCareerTexts,
  normalizeApiKey,
  normalizeBaseUrl,
  normalizeCareerPage,
  normalizeIds,
  normalizeMaxPositions,
  normalizeText,
  normalizeTitle,
  saveCareerSettings,
  type CareerSettings,
  type CareerTexts,
} from "../settings";
import { checkApplyForm } from "../apply";
import {
  getAllPositions,
  getApiKeySource,
  getBaseUrl,
  getCfgBaseUrl,
  getFetchHealth,
  getPositions,
  orderPositions,
  resetPositions,
  type JobList,
  type JobListStatus,
} from "../client";
import { formatDate } from "../dates";
import {
  CARD_HOVERS,
  COLOR_KEYS,
  CONTRAST_RULES,
  DEFAULT_DESIGN,
  FONT_KEYS,
  GRAPHICS,
  MIN_CONTRAST,
  RANGES,
  RANGE_KEYS,
  SYSTEM_FONTS,
  getContrastInUse,
  normalizeColor,
  normalizeFont,
  normalizeGraphic,
  normalizeHover,
  normalizeImageId,
  normalizeRange,
  type CareerDesign,
  type DesignRangeKey,
} from "../design";
import { MAX_IMAGES, findImage, getPreviewGraphicUrl, listImages } from "../images";
import { listSites, type NextSite } from "../site";
import type { Request, Response } from "@enonic-types/core";
import type {
  CareerDesignCard,
  CareerField,
  CareerImageOption,
  CareerRange,
  CareerFormChecks,
  CareerNotice,
  CareerOption,
  CareerPosition,
  CareerPreview,
  CareerSecret,
  CareerSection,
  CareerSitePicker,
  CareerStatusRow,
  CareerTextsCard,
  CareerToggle,
  CareerTool,
  CareerToolBody,
  CareerToolShell,
} from "./tool.freemarker";

/* ============================================================================
 * The admin tool: the settings of the career page and the link to Next, which
 * of the positions from Next the site shows and in which order, and how the
 * link to Next is doing. Everything in it is for one site at a time.
 *
 * The app has the tool's descriptor and a controller of a few lines, which
 * hands the request to `handleGet` and `handlePost` with what is the app's
 * own: the name of the tool and how to find its career pages.
 *
 * Administrators of XP and those with the role of the tool get in (access.ts).
 * The calls to Next carry the API key, so whoever sets the address decides
 * where the key is sent: only an administrator sets the two. The key can be
 * pasted in here, but it only goes one way: it is stored, and never written
 * back into the page, a redirect or the log.
 * ========================================================================== */

const view = resolve("tool.ftlh");

/** The tool's texts are in a bundle of their own, apart from the app's */
const BUNDLES = ["i18n/next-jobs"];

/** What the app that has the tool decides */
export type ToolOptions = {
  /** The name of the tool, as in its descriptor */
  title: string;
  /**
   * The content query that finds the pages with the app's list of positions.
   * They are the pages that can be the career page
   */
  careerPageQuery: string;
  /**
   * The look of the app's views where a site has set nothing: what the «Utseende» card shows
   * for a value that isn't the site's own. The colors as `#rrggbb`, the corners and the margin
   * in px, how much of the graphic shows in percent
   */
  designDefaults: DesignDefaults;
  /**
   * The fonts the site loads itself, which can then be chosen for the titles and the text beside
   * the fonts every device has. `family` is a list of font names as in CSS, without quotes
   */
  fonts?: { label: string; family: string }[];
};

/**
 * The values the «Utseende» card shows a default for. Those that can be left out are the same
 * as in the library's own views (`DEFAULT_DESIGN`) for an app that says nothing else
 */
export type DesignDefaults = {
  brand: string;
  accent: string;
  ink: string;
  button: string;
  radius: number;
  /** The color of the page behind the views */
  background?: string;
  margin?: number;
  /** How much of the app's own decoration behind the heading shows, when it reads `--next-jobs--graphic-opacity` */
  graphicOpacity?: number;
};

/** Which site the request is for: on the address of a GET, and in a hidden field of every form */
const SITE_PARAM = "site";

type Scope = {
  tool: ToolOptions;
  /** Every site with the app that the user may read */
  sites: NextSite[];
  /** The site the page is for. Undefined when no site has the app, or when a post names one that isn't there */
  site?: NextSite;
};

/**
 * The tool has no site and so no language of its own. It follows the browser, as the rest of the admin does:
 * Norwegian for someone who asks for it, otherwise English, and Norwegian when the browser says nothing
 */
type ToolLocale = "no" | "en";

const NORWEGIAN = ["nb", "nn", "no"];

/**
 * Where the language of the request is kept while it is answered: in the context, which follows the thread.
 * The variables of this file are shared by every request, so it can't be kept in one of them
 */
const LOCALE_ATTRIBUTE = "nextJobs.toolLocale";

/** Set on the redirect after a change, so a reload doesn't send the form again */
const DONE_PARAM = "ok";

/** `?check=forms` asks Next for the application form of each position. A reading, so it is a GET */
const CHECK_PARAM = "check";

/** Each check is a call to Next, and the API allows 300 per 15 minutes */
const MAX_FORM_CHECKS = 20;

const OSLO = "Europe/Oslo";

type Values = {
  baseUrl: string;
  maxPositions: string;
  careerPage: string;
};

/** The «Tekster» form. `count` is empty for the page's own choice, otherwise «show» or «hide» */
type TextValues = {
  title: string;
  text: string;
  count: string;
};

type TextErrors = {
  title?: string;
  text?: string;
  count?: string;
};

type Errors = {
  baseUrl?: string;
  apiKey?: string;
  maxPositions?: string;
  careerPage?: string;
};

export function handleGet(req: Request, tool: ToolOptions): Response {
  return inLanguage(req, () => get(req, tool));
}

export function handlePost(req: Request, tool: ToolOptions): Response {
  return inLanguage(req, () => post(req, tool));
}

function get(req: Request, tool: ToolOptions): Response {
  if (!canUseTool()) {
    return { status: 403 };
  }

  // Settings from before each site had its own are moved here when the app start came before the first site
  adoptLegacySettings();

  const done = first(req.params[DONE_PARAM]);
  const checkForms = first(req.params[CHECK_PARAM]) === "forms";

  return page(req, getScope(req, tool, false), {
    // The card the action was in is the one to come back to
    section:
      checkForms || done === "refreshed"
        ? "status"
        : done === "positions" || done === "display" || done === "design" || done === "texts"
          ? done
          : undefined,
    notice:
      done === "saved" ||
      done === "refreshed" ||
      done === "positions" ||
      done === "display" ||
      done === "design" ||
      done === "texts"
        ? { kind: "done", text: phrase(`tool.notice.${done}`) }
        : undefined,
    checkForms,
  });
}

function post(req: Request, tool: ToolOptions): Response {
  // The form is the only sender. A post from another site is turned down, also when the browser sends the session
  if (!canUseTool() || !isFromThisSite(req)) {
    return { status: 403 };
  }

  // A change is only ever for the site the form names: never for another one because that one is gone
  const scope = getScope(req, tool, true);
  const site = scope.site;

  if (!site) {
    return page(req, getScope(req, tool, false), {
      notice: { kind: "error", text: phrase("tool.notice.noSite") },
      status: 400,
    });
  }

  if (first(req.params.action) === "refresh") {
    resetPositions(site.key);

    return redirect(req, site, "refreshed");
  }

  if (first(req.params.action) === "positions") {
    return savePositions(req, scope, site);
  }

  if (first(req.params.action) === "display") {
    return saveDisplay(req, scope, site);
  }

  if (first(req.params.action) === "design") {
    return saveDesign(req, scope, site);
  }

  if (first(req.params.action) === "texts") {
    return saveTexts(req, scope, site);
  }

  // The address and the key are an administrator's. The form of anyone else has neither field, so a post with
  // one of them wasn't made by the form
  const mayConnect = canSetConnection();

  if (!mayConnect && hasConnectionFields(req)) {
    return { status: 403 };
  }

  const pages = findCareerPages(site, tool.careerPageQuery);
  const values: Values = {
    baseUrl: (first(req.params.baseUrl) ?? "").trim(),
    maxPositions: (first(req.params.maxPositions) ?? "").trim(),
    careerPage: (first(req.params.careerPage) ?? "").trim(),
  };
  const baseUrl = normalizeBaseUrl(values.baseUrl);
  // The key is kept out of `values` on purpose: what was typed is never written back into the page
  const typedKey = (first(req.params.apiKey) ?? "").trim();
  const apiKey = normalizeApiKey(typedKey);
  const maxPositions = normalizeMaxPositions(values.maxPositions);
  const careerPage = normalizeCareerPage(values.careerPage);
  const errors: Errors = {};

  // An empty field is allowed: the address in the .cfg file is used again
  if (values.baseUrl !== "" && !baseUrl) {
    errors.baseUrl = phrase("tool.baseUrl.error");
  }

  // An empty field is allowed here too: the key that is in use stays
  if (typedKey !== "" && !apiKey) {
    errors.apiKey = phrase("tool.apiKey.error");
  }

  if (values.maxPositions !== "" && !maxPositions) {
    errors.maxPositions = phrase("tool.maxPositions.error", [String(MAX_POSITIONS_LIMIT)]);
  }

  // Only a page from the list: one with the list of positions that the user may read
  if (values.careerPage !== "" && pages.filter((candidate) => candidate.key === careerPage).length === 0) {
    errors.careerPage = phrase("tool.careerPage.error");
  }

  if (errors.baseUrl || errors.apiKey || errors.maxPositions || errors.careerPage) {
    // A good key beside a field that was turned down is not saved either, and the field comes back empty
    if (apiKey) {
      errors.apiKey = phrase("tool.apiKey.again");
    }

    return page(req, scope, {
      values,
      errors,
      pages,
      notice: { kind: "error", text: phrase("tool.notice.invalid") },
      status: 400,
    });
  }

  // The field starts with the address in use. Sent back unchanged from the .cfg file, it is not stored here:
  // the .cfg file stays the source, and a later change there still counts
  const override = baseUrl && baseUrl !== normalizeBaseUrl(getCfgBaseUrl()) ? baseUrl : undefined;
  const addressBefore = getBaseUrl(site.key).baseUrl;
  // A pasted key replaces the stored one. The check box removes it, so the key in the .cfg file is used again
  const keyChange = apiKey ?? (first(req.params.removeApiKey) === "true" ? null : undefined);

  try {
    saveCareerSettings(
      site.key,
      // Without the right to set it, the stored address stays as it is
      (stored) => ({ ...stored, baseUrl: mayConnect ? override : stored.baseUrl, maxPositions, careerPage }),
      mayConnect ? keyChange : undefined,
    );
  } catch (e) {
    log.error("next-jobs-tool: the settings were not saved: %s", String(e));

    return page(req, scope, {
      values,
      errors: apiKey ? { apiKey: phrase("tool.apiKey.again") } : undefined,
      pages,
      notice: failedNotice(),
      status: 500,
    });
  }

  const addressChanged = getBaseUrl(site.key).baseUrl !== addressBefore;

  // The list in memory is from the old address, or was fetched (or turned down) with the old key
  if (addressChanged || keyChange !== undefined) {
    resetPositions(site.key);
  }

  log.info(
    "next-jobs-tool: the settings were saved (address %s, key %s)",
    addressChanged ? "changed" : "unchanged",
    keyChange === undefined ? "unchanged" : keyChange === null ? "removed" : "replaced",
  );

  return redirect(req, site, "saved");
}

/**
 * The sites with the app, and the one the request names. A page that names
 * none, or one that is gone, shows the first. A post is stricter (`exact`):
 * it gets no site unless the one it names is there
 */
function getScope(req: Request, tool: ToolOptions, exact: boolean): Scope {
  const sites = listSites();
  const wanted = first(req.params[SITE_PARAM]);
  const named = sites.filter((site) => site.key === wanted)[0];

  return { tool, sites, site: named ?? (exact ? undefined : sites[0]) };
}

/**
 * The form sends every position it listed (`listed`), in the order they stand
 * in, and those with a check mark (`shown`). Only the listed ones are changed:
 * a position hidden earlier that Next doesn't send right now stays hidden,
 * also when Next is down
 */
function savePositions(req: Request, scope: Scope, site: NextSite): Response {
  const listed = normalizeIds(req.params.listed);
  const shown = normalizeIds(req.params.shown);
  const nowHidden = listed.filter((id) => shown.indexOf(id) === -1);
  // The order Next gives the same positions. Sent back in that order, no order is stored:
  // newest first stays the rule, also for what Next changes later
  const newestFirst = getAllPositions(site.key)
    .positions.map((position) => position.id)
    .filter((id) => listed.indexOf(id) !== -1);
  const positionOrder = newestFirst.join("\n") === listed.join("\n") ? undefined : listed;

  try {
    saveCareerSettings(site.key, (stored) => ({
      ...stored,
      hiddenPositions: (stored.hiddenPositions ?? []).filter((id) => listed.indexOf(id) === -1).concat(nowHidden),
      positionOrder,
    }));
  } catch (e) {
    log.error("next-jobs-tool: the choice of positions was not saved: %s", String(e));

    return page(req, scope, { section: "positions", notice: failedNotice(), status: 500 });
  }

  log.info(
    "next-jobs-tool: the choice of positions was saved (%s of %s listed are hidden, %s order)",
    nowHidden.length,
    listed.length,
    positionOrder ? "own" : "newest first",
  );

  return redirect(req, site, "positions");
}

/** The form sends the switches that are on (`show`). Every switch is stored, so a later change of a default changes nothing here */
function saveDisplay(req: Request, scope: Scope, site: NextSite): Response {
  const on = normalizeIds(req.params.show);
  const display = getCareerDisplay(site.key);

  DISPLAY_KEYS.forEach((key) => {
    display[key] = on.indexOf(key) !== -1;
  });

  try {
    saveCareerSettings(site.key, (stored) => ({ ...stored, display }));
  } catch (e) {
    log.error("next-jobs-tool: the display switches were not saved: %s", String(e));

    return page(req, scope, { section: "display", notice: failedNotice(), status: 500 });
  }

  log.info("next-jobs-tool: the display switches were saved");

  return redirect(req, site, "display");
}

/**
 * The heading, the text and the count above the list. An empty field is not
 * stored, so the page's own applies to it
 */
function saveTexts(req: Request, scope: Scope, site: NextSite): Response {
  const values: TextValues = {
    title: (first(req.params.listTitle) ?? "").trim(),
    text: (first(req.params.listText) ?? "").trim(),
    count: (first(req.params.listCount) ?? "").trim(),
  };
  const texts: CareerTexts = {
    title: normalizeTitle(values.title),
    text: normalizeText(values.text),
    showCount: values.count === "show" ? true : values.count === "hide" ? false : undefined,
  };
  const errors: TextErrors = {};

  if (values.title !== "" && !texts.title) {
    errors.title = phrase("tool.listTitle.error", [String(TITLE_MAX_LENGTH)]);
  }

  if (values.text !== "" && !texts.text) {
    errors.text = phrase("tool.listText.error", [String(TEXT_MAX_LENGTH)]);
  }

  if (values.count !== "" && texts.showCount === undefined) {
    errors.count = phrase("tool.listCount.error");
  }

  if (errors.title || errors.text || errors.count) {
    return page(req, scope, {
      section: "texts",
      texts: { values, errors },
      notice: { kind: "error", text: phrase("tool.notice.invalid") },
      status: 400,
    });
  }

  try {
    saveCareerSettings(site.key, (stored) => ({ ...stored, texts }));
  } catch (e) {
    log.error("next-jobs-tool: the texts were not saved: %s", String(e));

    return page(req, scope, { section: "texts", texts: { values, errors }, notice: failedNotice(), status: 500 });
  }

  log.info("next-jobs-tool: the texts above the list were saved");

  return redirect(req, site, "texts");
}

/**
 * The form sends which values are the site's own (`own`), and a value for
 * each. A value that isn't the site's own is not stored, so the look of the
 * site applies to it
 */
function saveDesign(req: Request, scope: Scope, site: NextSite): Response {
  const own = normalizeIds(req.params.own);
  const design: CareerDesign = {};
  let invalid = false;

  COLOR_KEYS.forEach((key) => {
    if (own.indexOf(key) !== -1) {
      const color = normalizeColor(first(req.params[key]));

      design[key] = color;
      invalid = invalid || !color;
    }
  });

  RANGE_KEYS.forEach((key) => {
    if (own.indexOf(key) !== -1) {
      design[key] = normalizeRange(key, first(req.params[key]));
      invalid = invalid || design[key] === undefined;
    }
  });

  // The lists have an empty choice for the site's own. Anything else must be one of the fonts in the list
  const fonts = getFonts(scope.tool).map((font) => font.family);

  FONT_KEYS.forEach((key) => {
    const typed = (first(req.params[key]) ?? "").trim();

    if (typed !== "") {
      design[key] = fonts.indexOf(typed) !== -1 ? normalizeFont(typed) : undefined;
      invalid = invalid || !design[key];
    }
  });

  const hover = (first(req.params.hover) ?? "").trim();

  if (hover !== "") {
    design.hover = normalizeHover(hover);
    invalid = invalid || !design.hover;
  }

  const graphic = (first(req.params.graphic) ?? "").trim();

  if (graphic !== "") {
    design.graphic = normalizeGraphic(graphic);
    invalid = invalid || !design.graphic;
  }

  if (design.graphic === "image") {
    const image = normalizeImageId(first(req.params.graphicImage));

    // An image of the site's project that the user can read. The script asks for one before the form is sent
    if (!image || !findImage(site, image, "draft")) {
      return page(req, scope, {
        section: "design",
        notice: { kind: "error", text: phrase("tool.design.graphicImage.error") },
        status: 400,
      });
    }

    design.graphicImage = image;
  }

  // The form's own controls can't send anything else, so this is a request made by hand
  if (invalid) {
    return page(req, scope, {
      section: "design",
      notice: { kind: "error", text: phrase("tool.design.error") },
      status: 400,
    });
  }

  try {
    saveCareerSettings(site.key, (stored) => ({ ...stored, design }));
  } catch (e) {
    log.error("next-jobs-tool: the design was not saved: %s", String(e));

    return page(req, scope, { section: "design", notice: failedNotice(), status: 500 });
  }

  log.info("next-jobs-tool: the design was saved (%s values of the site's own)", String(Object.keys(design).length));

  return redirect(req, site, "design");
}

function failedNotice(): CareerNotice {
  return { kind: "error", text: phrase("tool.notice.failed") };
}

/**
 * The settings form as it is in use: the address from here or from the .cfg
 * file, the stored limit, and the chosen page when it still has the list of positions
 */
function getStoredValues(siteKey: string, settings: CareerSettings, pages: CareerPage[]): Values {
  const chosen = settings.careerPage ?? "";

  return {
    baseUrl: getBaseUrl(siteKey).baseUrl,
    maxPositions: settings.maxPositions ? String(settings.maxPositions) : "",
    careerPage: pages.filter((candidate) => candidate.key === chosen).length > 0 ? chosen : "",
  };
}

type PageOptions = {
  /** What was typed, when it was turned down. Otherwise the form shows what is in use */
  values?: Values;
  errors?: Errors;
  /** The pages with the list of positions, when the caller has looked them up already */
  pages?: CareerPage[];
  notice?: CareerNotice;
  status?: number;
  /** Ask Next for the application form of each position */
  checkForms?: boolean;
  /** The card to show. Without it, the first: the settings */
  section?: CareerSection;
  /** What was typed in «Tekster», when it was turned down */
  texts?: { values: TextValues; errors: TextErrors };
};

function page(req: Request, scope: Scope, options: PageOptions): Response {
  const site = scope.site;
  const shell: CareerToolShell = {
    lang: getLocale(),
    title: scope.tool.title,
    intro: phrase("tool.intro"),
    logo: { url: assetUrl({ path: "next-jobs/next-logo-negative.png" }), alt: phrase("tool.logo") },
    faviconUrl: assetUrl({ path: "next-jobs/next-icon.svg" }),
    action: req.path,
    notice: options.notice,
    siteKey: site?.key ?? "",
    sitePicker: site && scope.sites.length > 1 ? getSitePicker(scope.sites, site) : undefined,
  };

  return {
    status: options.status ?? 200,
    contentType: "text/html; charset=utf-8",
    body: render<CareerTool>(
      view,
      site ? { ...shell, ...getBody(req, scope, site, options) } : { ...shell, empty: phrase("tool.site.none") },
    ),
  };
}

/** The choice of site, shown when more than one has the app */
function getSitePicker(sites: NextSite[], selected: NextSite): CareerSitePicker {
  return {
    label: phrase("tool.site"),
    submit: phrase("tool.site.show"),
    options: sites.map((site) => ({
      value: site.key,
      label: phrase("tool.site.option", [site.displayName, site.project, site.path]),
      selected: site.key === selected.key,
    })),
  };
}

/** The cards of the page, for the site it is for */
function getBody(req: Request, scope: Scope, site: NextSite, options: PageOptions): CareerToolBody {
  // One reading of each for the whole page, so the cards agree with each other
  const list = getAllPositions(site.key);
  const settings = getCareerSettings(site.key);
  const positions = getPositionRows(list, settings);
  const pages = options.pages ?? findCareerPages(site, scope.tool.careerPageQuery);
  const careerPage = pickCareerPage(pages, settings.careerPage);
  // What the buttons compare with: «Lagre» is for changes from this
  const saved = getStoredValues(site.key, settings, pages);
  const values = options.values ?? saved;
  const errors = options.errors ?? {};

  return {
    navLabel: phrase("tool.nav"),
    section: options.section ?? "settings",
    preview: careerPage ? getPreview(req, careerPage) : undefined,
    settingsHeading: phrase("tool.settings"),
    baseUrl: field("baseUrl", values.baseUrl, saved.baseUrl, errors.baseUrl),
    apiKey: getKeyField(site.key, errors.apiKey),
    connectionLocked: canSetConnection() ? undefined : phrase("tool.connection.locked"),
    maxPositions: {
      ...field("maxPositions", values.maxPositions, saved.maxPositions, errors.maxPositions),
      options: getMaxPositionsOptions(values.maxPositions),
    },
    careerPage: {
      ...field("careerPage", values.careerPage, saved.careerPage, errors.careerPage),
      options: getCareerPageOptions(pages, values.careerPage),
    },
    save: phrase("tool.save"),
    statusHeading: phrase("tool.status"),
    displayHeading: phrase("tool.display"),
    displayHelp: phrase("tool.display.help"),
    display: getToggles(site.key),
    design: getDesignCard(site, scope.tool, careerPage ? getPreviewSiteUrl(req, site, careerPage) : undefined),
    texts: getTextsCard(site.key, options.texts),
    positionsHeading: phrase("tool.positions"),
    positionsHelp: phrase("tool.positions.help"),
    positions,
    positionsEmpty:
      positions.length > 0
        ? undefined
        : phrase(list.status === "ok" ? "tool.positions.none" : "tool.positions.unknown"),
    order: {
      saved: positions.map((position) => position.id).join(","),
      max: settings.maxPositions ? String(settings.maxPositions) : "",
      reset: phrase("tool.positions.reset"),
      drag: phrase("tool.positions.drag"),
      // The script fills in the title, the place and the count
      moved: phrase("tool.positions.moved", ["%title%", "%place%", "%count%"]),
    },
    status: getStatusRows(site.key, list, positions, careerPage),
    refresh: phrase("tool.refresh"),
    checkForms: phrase("tool.forms.check"),
    formChecks: options.checkForms ? getFormChecks(site.key) : undefined,
  };
}

function field(name: string, value: string, saved: string, error: string | undefined): CareerField {
  return {
    label: phrase(`tool.${name}`),
    help: phrase(`tool.${name}.help`),
    value,
    saved,
    error,
  };
}

/**
 * The field for the key. It has no value: the key is never written into the
 * page. Dots in the empty field show that a key is in use, and the help text
 * says which one
 */
function getKeyField(siteKey: string, error: string | undefined): CareerSecret {
  const source = getApiKeySource(siteKey);

  return {
    label: phrase("tool.apiKey"),
    help: phrase(`tool.apiKey.help.${source}`),
    error,
    masked: source !== "none",
    remove: source === "admin" ? phrase("tool.apiKey.remove") : undefined,
  };
}

/** «Alle» first, then 1 to the limit */
function getMaxPositionsOptions(selected: string): CareerOption[] {
  const options: CareerOption[] = [{ value: "", label: phrase("tool.maxPositions.all"), selected: selected === "" }];

  for (let number = 1; number <= MAX_POSITIONS_LIMIT; number++) {
    options.push({ value: String(number), label: String(number), selected: selected === String(number) });
  }

  return options;
}

/** «Velg automatisk» first, then every page with the list of positions */
function getCareerPageOptions(pages: CareerPage[], selected: string): CareerOption[] {
  return [{ value: "", label: phrase("tool.careerPage.auto"), selected: selected === "" }].concat(
    pages.map((candidate) => ({
      value: candidate.key,
      label: phrase(`tool.careerPage.option.${candidate.branch}`, [candidate.displayName, candidate.path]),
      selected: selected === candidate.key,
    })),
  );
}

/** The switches as they are in use now */
function getToggles(siteKey: string): CareerToggle[] {
  const display = getCareerDisplay(siteKey);

  return DISPLAY_KEYS.map((key) => ({
    key,
    label: phrase(`tool.display.${key}`),
    help: phrase(`tool.display.${key}.help`),
    on: display[key],
  }));
}

/** The texts above the list as the site has set them. An empty field is the page's own */
function getTextsCard(siteKey: string, typed: { values: TextValues; errors: TextErrors } | undefined): CareerTextsCard {
  const texts = getCareerTexts(siteKey);
  const saved: TextValues = {
    title: texts.title ?? "",
    text: texts.text ?? "",
    count: texts.showCount === undefined ? "" : texts.showCount ? "show" : "hide",
  };
  const values = typed?.values ?? saved;
  const errors = typed?.errors ?? {};

  return {
    heading: phrase("tool.texts"),
    help: phrase("tool.texts.help"),
    title: field("listTitle", values.title, saved.title, errors.title),
    titleMax: String(TITLE_MAX_LENGTH),
    text: field("listText", values.text, saved.text, errors.text),
    textMax: String(TEXT_MAX_LENGTH),
    count: {
      ...field("listCount", values.count, saved.count, errors.count),
      options: ["", "show", "hide"].map((value) => ({
        value,
        label: phrase(`tool.listCount.${value === "" ? "page" : value}`),
        selected: values.count === value,
      })),
    },
  };
}

/**
 * The colors and corners as they are in use: the site's own where it has
 * set one, otherwise what the app's views have. A warning follows a color of
 * the site's own that text gets hard to read with
 */
function getDesignCard(site: NextSite, tool: ToolOptions, previewSiteUrl: string | undefined): CareerDesignCard {
  const design = getCareerDesign(site.key);
  const defaults = { ...DEFAULT_DESIGN, ...tool.designDefaults };
  const fonts = getFonts(tool);
  const own = phrase("tool.design.choice.own");
  // The text and the links stand on the background, in the colors that are in use
  const text = [design.ink ?? defaults.ink, design.accent ?? defaults.accent];

  return {
    heading: phrase("tool.design"),
    help: phrase("tool.design.help"),
    ownColor: phrase("tool.design.own"),
    ownValue: phrase("tool.design.ownValue"),
    minContrast: String(MIN_CONTRAST),
    // The script fills in the contrast as the color is chosen
    warning: phrase("tool.design.warning", ["%ratio%"]),
    colors: COLOR_KEYS.map((key) => {
      const own = design[key];
      const ratio = own ? getContrastInUse(key, own, text) : undefined;

      return {
        key,
        label: phrase(`tool.design.${key}`),
        help: phrase(`tool.design.${key}.help`),
        own: !!own,
        value: own ?? defaults[key],
        contrast: CONTRAST_RULES[key],
        warning:
          ratio !== undefined && ratio < MIN_CONTRAST ? phrase("tool.design.warning", [formatRatio(ratio)]) : undefined,
      };
    }),
    ranges: [getRange("radius", design, defaults), getRange("margin", design, defaults)],
    // Each a list with the site's own first. A font that is stored but no longer in the list is shown as the site's own
    choices: [
      ...FONT_KEYS.map((key) => ({
        key,
        label: phrase(`tool.design.${key}`),
        help: phrase(`tool.design.${key}.help`),
        value: fonts.filter((font) => font.family === design[key]).length > 0 ? (design[key] ?? "") : "",
        options: [{ value: "", label: own }].concat(fonts.map((font) => ({ value: font.family, label: font.label }))),
      })),
      {
        key: "hover",
        label: phrase("tool.design.hover"),
        help: phrase("tool.design.hover.help"),
        value: design.hover ?? "",
        options: [{ value: "", label: own }].concat(
          CARD_HOVERS.map((hover) => ({ value: hover, label: phrase(`tool.design.hover.${hover}`) })),
        ),
      },
    ].map((choice) => ({
      ...choice,
      options: choice.options.map((option) => ({ ...option, selected: option.value === choice.value })),
    })),
    graphic: {
      key: "graphic",
      label: phrase("tool.design.graphic"),
      help: phrase("tool.design.graphic.help"),
      value: design.graphic ?? "",
      options: [{ value: "", label: own }]
        .concat(GRAPHICS.map((graphic) => ({ value: graphic, label: phrase(`tool.design.graphic.${graphic}`) })))
        .map((option) => ({ ...option, selected: option.value === (design.graphic ?? "") })),
    },
    graphicImage: getImageChoice(site, design, previewSiteUrl),
    graphicOpacity: getRange("graphicOpacity", design, defaults),
  };
}

/** A slider with the site's own value, or what the app's views have when it has none */
function getRange(key: DesignRangeKey, design: CareerDesign, defaults: Record<DesignRangeKey, number>): CareerRange {
  const value = String(design[key] ?? defaults[key]);
  const unit = key === "graphicOpacity" ? "percent" : "px";

  return {
    key,
    label: phrase(`tool.design.${key}`),
    help: phrase(`tool.design.${key}.help`),
    own: design[key] !== undefined,
    value,
    max: String(RANGES[key].max),
    step: String(RANGES[key].step),
    text: phrase(`tool.design.value.${unit}`, [value]),
    // The script fills in the number as the slider moves
    valueText: phrase(`tool.design.value.${unit}`, ["%value%"]),
  };
}

/**
 * The images of the site's project to choose the graphic among, the one
 * changed last first. The chosen one is in the list also when it is older
 * than those, and a note says when visitors don't get to see it
 */
function getImageChoice(
  site: NextSite,
  design: CareerDesign,
  previewSiteUrl: string | undefined,
): CareerDesignCard["graphicImage"] {
  const chosenId = design.graphic === "image" ? design.graphicImage : undefined;
  const chosen = chosenId ? findImage(site, chosenId, "draft") : undefined;
  const listed = listImages(site);
  const images =
    chosen && listed.filter((image) => image.id === chosen.id).length === 0 ? [chosen].concat(listed) : listed;
  const none: CareerImageOption = { value: "", label: phrase("tool.design.graphicImage.choose"), selected: !chosen };

  return {
    key: "graphicImage",
    label: phrase("tool.design.graphicImage"),
    help: phrase("tool.design.graphicImage.help", [String(MAX_IMAGES)]),
    value: chosen?.id ?? "",
    options: [none].concat(
      images.map((image) => ({
        value: image.id,
        label: phrase("tool.design.graphicImage.option", [image.displayName, image.folder]),
        selected: image.id === chosen?.id,
        url: previewSiteUrl ? getPreviewGraphicUrl(previewSiteUrl, image) : undefined,
      })),
    ),
    note: !chosenId
      ? undefined
      : !chosen
        ? phrase("tool.design.graphicImage.gone")
        : !findImage(site, chosen.id, "master")
          ? phrase("tool.design.graphicImage.unpublished")
          : undefined,
  };
}

/** The fonts that can be chosen: those the app says the site loads, then those every device has */
function getFonts(tool: ToolOptions): { label: string; family: string }[] {
  const own = (tool.fonts ?? []).filter((font) => normalizeFont(font.family) === font.family);

  return own.concat(
    SYSTEM_FONTS.map((font) => ({ label: phrase(`tool.design.font.${font.key}`), family: font.family })),
  );
}

/** «3,2», or «3.2» in English: one decimal, rounded down so a contrast just under the limit isn't shown as the limit */
function formatRatio(ratio: number): string {
  const text = (Math.floor(ratio * 10) / 10).toFixed(1);

  return getLocale() === "en" ? text : text.replace(".", ",");
}

/**
 * Every position Next publishes, in the order of the site. A position with a
 * check mark is on the site; one past the limit is on the site, but not in
 * the list
 */
function getPositionRows(list: JobList, settings: CareerSettings): CareerPosition[] {
  const hidden = settings.hiddenPositions ?? [];
  const max = settings.maxPositions;
  let visible = 0;

  return orderPositions(list.positions, settings.positionOrder ?? []).map((position) => {
    const shown = hidden.indexOf(position.id) === -1;
    const details = [position.unit, position.location, position.employmentType].filter((value) => !!value);

    if (shown) {
      visible++;
    }

    return {
      id: position.id,
      title: position.title,
      details: details
        .concat(
          position.deadline ? [phrase("tool.positions.deadline", [formatDate(position.deadline, getLocale())])] : [],
        )
        .join(" · "),
      shown,
      // Where Next has it, newest first: «Nyeste først» puts the rows back in this order
      defaultIndex: list.positions.indexOf(position),
      overLimit: !!max && shown && visible > max,
      note: phrase("tool.positions.overLimit"),
      moveUp: phrase("tool.positions.moveUp", [position.title]),
      moveDown: phrase("tool.positions.moveDown", [position.title]),
    };
  });
}

/** What is stored, not what was just typed: the status shows what the site uses now */
function getStatusRows(
  siteKey: string,
  { status, positions }: JobList,
  rows: CareerPosition[],
  careerPage: CareerPage | undefined,
): CareerStatusRow[] {
  const { baseUrl, source } = getBaseUrl(siteKey);
  const keySource = getApiKeySource(siteKey);
  const inList = rows.filter((row) => row.shown && !row.overLimit).length;
  const health = getFetchHealth(siteKey);
  const statusRows: CareerStatusRow[] = [
    {
      label: phrase("tool.status.address"),
      value:
        source === "none" ? phrase("tool.status.address.none") : phrase(`tool.status.address.${source}`, [baseUrl]),
      tone: source === "none" ? "problem" : "plain",
    },
    {
      label: phrase("tool.status.key"),
      value: phrase(`tool.status.key.${keySource}`),
      tone: keySource === "none" ? "problem" : "plain",
    },
    {
      label: phrase("tool.status.connection"),
      value: getConnectionText(status, positions.length),
      tone: status === "ok" ? "ok" : "problem",
    },
  ];

  if (status === "ok" || status === "stale") {
    statusRows.push({
      label: phrase("tool.status.shown"),
      value:
        inList < positions.length
          ? phrase("tool.status.shown.limited", [String(inList), String(positions.length)])
          : phrase("tool.status.shown.all", [String(positions.length)]),
      tone: "plain",
    });
  }

  statusRows.push(
    {
      label: phrase("tool.status.lastOk"),
      value: health.lastOkAt ? formatTime(health.lastOkAt) : phrase("tool.status.sinceStart"),
      tone: "plain",
    },
    {
      label: phrase("tool.status.lastError"),
      value: health.lastError
        ? phrase("tool.status.lastError.value", [formatTime(health.lastError.at), getErrorText(health.lastError.code)])
        : phrase("tool.status.sinceStart"),
      // An old error that a good call has followed is history, not a problem
      tone: health.lastError && health.lastError.at >= (health.lastOkAt ?? 0) ? "problem" : "plain",
    },
  );

  statusRows.push({
    label: phrase("tool.status.page"),
    value: careerPage
      ? phrase(`tool.status.page.${careerPage.branch}`, [careerPage.path])
      : phrase("tool.status.page.none"),
    tone: careerPage ? "plain" : "problem",
  });

  return statusRows;
}

/**
 * The page as the admin serves it. It is on the same host as the tool, and it
 * is there for a page that isn't published. The frame uses the «inline» mode,
 * the one Content Studio frames: XP answers «preview» with X-Frame-Options:
 * DENY, so that one is only for the link to a new tab. The admin can be
 * mounted anywhere, so the addresses start from where the tool itself is
 */
/** The site itself as the frame of the preview is served it: the same mode and the same branch as the career page there */
function getPreviewSiteUrl(req: Request, site: NextSite, careerPage: CareerPage): string {
  return `${req.path.split("/tool/")[0]}/site/inline/${careerPage.project}/${careerPage.branch}${site.path}`;
}

function getPreview(req: Request, careerPage: CareerPage): CareerPreview {
  const adminBase = req.path.split("/tool/")[0];
  const page = `${careerPage.project}/${careerPage.branch}${careerPage.path}`;

  return {
    frameUrl: `${adminBase}/site/inline/${page}`,
    newTabUrl: `${adminBase}/site/preview/${page}`,
    open: phrase("tool.preview.open"),
    close: phrase("tool.preview.close"),
    heading: phrase("tool.preview"),
    note: phrase(`tool.preview.note.${careerPage.branch}`),
    zoom: phrase("tool.preview.zoom"),
    zoomValue: phrase("tool.preview.zoom.value", ["%percent%", "%width%"]),
    zoomValueText: phrase("tool.preview.zoom.valueText", ["%percent%", "%width%"]),
    reload: phrase("tool.preview.reload"),
    newTab: phrase("tool.preview.newTab"),
    frameTitle: phrase("tool.preview.frameTitle"),
  };
}

/** What a call that gave no list means, by the HTTP status. 0 is no answer at all */
function getErrorText(code: number): string {
  if (code === 0 || code === 200 || code === 401 || code === 404 || code === 429) {
    return phrase(`tool.status.error.${code}`);
  }

  return phrase(code >= 300 && code < 400 ? "tool.status.error.redirect" : "tool.status.error.other", [String(code)]);
}

/** «23. nov. 2026 kl. 13:02:11», or «23 Nov 2026 at 13:02:11». Norwegian time in both */
function formatTime(epochMillis: number): string {
  const english = getLocale() === "en";

  return formatInstant({
    date: new Date(epochMillis),
    pattern: english ? "d MMM yyyy 'at' HH:mm:ss" : "d. MMM yyyy 'kl.' HH:mm:ss",
    locale: getLocale(),
    timezoneId: OSLO,
  });
}

/**
 * Asks Next for the application form of each position on the site, past the
 * cache, so the answer is what a candidate would meet now. Hidden positions
 * are left out: nobody can apply for them from the site
 */
function getFormChecks(siteKey: string): CareerFormChecks {
  const positions = getPositions(siteKey).positions;
  const rows: CareerStatusRow[] = positions.slice(0, MAX_FORM_CHECKS).map((position) => {
    // In the language of the tool: an English form is as good a sign that Next answers as a Norwegian one
    const result = checkApplyForm(siteKey, position.id, getLocale() === "en" ? "en" : "nb");

    if (result.status !== "ok") {
      return { label: position.title, value: phrase(`tool.forms.${result.status}`), tone: "problem" };
    }

    return {
      label: position.title,
      // Name and email are always asked for, besides the fields Next lists
      value: phrase(result.form.cvRead ? "tool.forms.ok.cvRead" : "tool.forms.ok", [
        String(result.form.fields.length + 2),
      ]),
      tone: "ok",
    };
  });

  return {
    heading: phrase("tool.forms"),
    help: phrase("tool.forms.help", [formatTime(Date.now())]),
    rows,
    note:
      positions.length === 0
        ? phrase("tool.forms.none")
        : positions.length > MAX_FORM_CHECKS
          ? phrase("tool.forms.more", [String(MAX_FORM_CHECKS)])
          : undefined,
  };
}

function getConnectionText(status: JobListStatus, count: number): string {
  return phrase(`tool.status.connection.${status}`, [String(count)]);
}

function redirect(
  req: Request,
  site: NextSite,
  done: "saved" | "refreshed" | "positions" | "display" | "design" | "texts",
): Response {
  // 303: the browser fetches the page with GET, so a reload doesn't post again. The site follows, so the page is the same one
  return {
    status: 303,
    headers: { Location: `${req.path}?${SITE_PARAM}=${encodeURIComponent(site.key)}&${DONE_PARAM}=${done}` },
  };
}

/** The fields of the link to Next: the address, a pasted key, and the check box that removes the stored key */
function hasConnectionFields(req: Request): boolean {
  return req.params.baseUrl !== undefined || req.params.apiKey !== undefined || req.params.removeApiKey !== undefined;
}

/**
 * The browser says where a post comes from in Origin. It must be the host the
 * request came to, also behind a proxy that passes the host on
 */
function isFromThisSite(req: Request): boolean {
  const origin = header(req, "origin")?.replace(/^https?:\/\//i, "");

  return !!origin && (origin === header(req, "host") || origin === header(req, "x-forwarded-host"));
}

/** Header names keep the case they were sent with */
function header(req: Request, name: string): string | undefined {
  const headers = req.headers ?? {};
  const key = Object.keys(headers).filter((candidate) => candidate.toLowerCase() === name)[0];

  return key ? (headers[key] ?? undefined) : undefined;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Runs the answer to a request with its language in the context, where `phrase` finds it */
function inLanguage<T>(req: Request, callback: () => T): T {
  return run({ attributes: { [LOCALE_ATTRIBUTE]: getRequestLocale(req) } }, callback);
}

/** The language of the request that is being answered. Norwegian outside `inLanguage` */
function getLocale(): ToolLocale {
  return getContext().attributes?.[LOCALE_ATTRIBUTE] === "en" ? "en" : "no";
}

/**
 * The first language the browser asks for (Accept-Language) that the tool has: a Norwegian one, or English.
 * Someone who asks for neither gets English, and a request without the header gets Norwegian
 */
function getRequestLocale(req: Request): ToolLocale {
  const wanted = (header(req, "accept-language") ?? "")
    .split(",")
    .map((part, index) => {
      const pieces = part.trim().split(";");
      const weight = pieces.filter((piece) => piece.trim().indexOf("q=") === 0)[0];

      return {
        // «en-GB» is English here
        language: pieces[0].trim().toLowerCase().split("-")[0],
        weight: weight ? Number(weight.trim().substring(2)) : 1,
        index,
      };
    })
    .filter((entry) => entry.language !== "" && entry.language !== "*" && entry.weight > 0)
    // The most wanted first. Equal weights keep the order they were sent in
    .sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (let i = 0; i < wanted.length; i++) {
    if (NORWEGIAN.indexOf(wanted[i].language) !== -1) {
      return "no";
    }

    if (wanted[i].language === "en") {
      return "en";
    }
  }

  return wanted.length > 0 ? "en" : "no";
}

function phrase(key: string, values?: string[]): string {
  return localize({ key, locale: getLocale(), values, bundles: BUNDLES });
}
