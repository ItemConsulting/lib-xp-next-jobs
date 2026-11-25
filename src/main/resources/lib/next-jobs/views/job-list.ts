import { getContent, pageUrl } from "/lib/xp/portal";
import { render } from "/lib/freemarker";
import { getDesignGraphic, getDesignHover, toDesignStyle, type CareerDesign } from "../design";
import { getGraphicUrl } from "../images";
import { getCareerDesign, getCareerDisplay, getCareerSettings, getCareerTexts, type CareerDisplay } from "../settings";
import { getPositions, type JobListStatus } from "../client";
import { formatDate } from "../dates";
import { DETAIL_PARAM, getRequestedId } from "../page";
import { getCurrentSiteKey } from "../site";
import { phrase } from "./phrases";
import type { SiteContact, SitePosition } from "../types";
import type { JobArticle, JobCard, JobContact, JobDetail, JobListModel, JobSection } from "./job-list.freemarker";
import type { Request } from "@enonic-types/core";

const view = resolve("job-list.ftlh");

/** The cards take five looks in turn, for a site that wants them to differ */
const VARIANTS = 5;

/** What the component that shows the list hands in: the site's own, which this library knows nothing about */
export type JobListOptions = {
  req: Request;
  /** The language of the page */
  locale: string;
  /** The anchor of the list on the page. The posting links back to it */
  id: string;
  /** The heading, the text and whether the count is shown. What is set in the admin tool goes before the three */
  title: string;
  text?: string;
  showCount?: boolean;
  /** 1 when the heading of the list is the heading of the page. 2 without it */
  headingLevel?: 1 | 2;
  /** The page has the application form, so the posting has no button to the form in Next */
  applyOnSite: boolean;
  /** Classes of the site's own on the outermost element */
  rootClass?: string;
  /** The site's own class for a button. Without it, the button of this library */
  buttonClass?: string;
};

/**
 * The published positions from Next as cards, without those hidden in the
 * admin tool. Each card has one link, to the position on this page
 * (?stilling=<id>). With the parameter, the view shows that one position
 * instead of the list, and the application form on the page shows the full
 * description and the form. Without the form, the posting ends with a button
 * to the form in Next
 */
export function renderJobList(options: JobListOptions): string {
  return render<JobListModel>(view, getJobListModel(options));
}

/** The model alone, for a site that draws it with a view of its own around the macro in job-list-macro.ftlh */
export function getJobListModel(options: JobListOptions): JobListModel {
  const { req, locale, id } = options;
  // The settings and the positions are those of the site the page is on
  const siteKey = getCurrentSiteKey();
  const { status, positions } = getPositions(siteKey);
  const requested = getRequestedId(req.params[DETAIL_PARAM]);
  // What is shown of the posting is set in the admin tool, for every page with the list
  const display = getCareerDisplay(siteKey);
  const design = getCareerDesign(siteKey);

  const common = {
    id,
    headingLevel: options.headingLevel ?? 2,
    rootClass: options.rootClass,
    buttonClass: options.buttonClass ?? "next-jobs-button",
    designStyle: toDesignStyle(design),
    designHover: getDesignHover(design),
    ...getGraphic(design),
    // Visitors only see the friendly text. Editors are told why the list is empty or old
    editorNotice: req.mode !== "live" ? getEditorNotice(locale, status) : undefined,
    listLabel: phrase(locale, "jobList.listLabel"),
    readMore: phrase(locale, "jobList.readMore"),
  };

  if (requested !== undefined) {
    const position = positions.filter((candidate) => candidate.id === requested)[0];
    const back = {
      // The same page without the parameter, back to the list
      backUrl: `${thisPageUrl()}#${id}`,
      backLabel: phrase(locale, "jobList.back"),
      positions: [],
    };

    return position
      ? {
          ...common,
          ...back,
          title: position.title,
          detail: getDetail(position, locale, { display, applyOnSite: options.applyOnSite }),
        }
      : {
          ...common,
          ...back,
          title: phrase(locale, "jobList.missing.title"),
          missing: { text: phrase(locale, "jobList.missing.text") },
        };
  }

  // The limit from the admin tool applies to the list only: a position outside it can still be opened
  const max = getCareerSettings(siteKey).maxPositions;
  const shown = max ? positions.slice(0, max) : positions;

  // The heading, the text and the count from the admin tool go before the component's own, on every page with the list
  const texts = getCareerTexts(siteKey);

  return {
    ...common,
    title: texts.title ?? options.title,
    countLine: getCountLine(shown.length, locale, texts.showCount ?? options.showCount ?? true),
    text: texts.text ?? (options.text?.trim() || undefined),
    positions: shown.map((position, index) => getCard(position, index, { showDeadline: display.deadline }, locale)),
  };
}

/**
 * The graphic behind the heading that the site has set. An image that isn't
 * in the branch of the page (not published, or deleted) gives none, so the
 * site's own decoration is what a visitor then sees
 */
function getGraphic(design: CareerDesign): Pick<JobListModel, "designGraphic" | "graphicImageUrl"> {
  const graphic = getDesignGraphic(design);

  if (graphic !== "image") {
    return { designGraphic: graphic };
  }

  const graphicImageUrl = design.graphicImage ? getGraphicUrl(design.graphicImage) : undefined;

  return graphicImageUrl ? { designGraphic: graphic, graphicImageUrl } : {};
}

/** The page the list is on, with the given query parameters only */
function thisPageUrl(params?: Record<string, string>): string {
  return pageUrl({ id: getContent()?._id ?? "", params });
}

/** An empty list always says so, also without the count: the visitor would otherwise see nothing */
function getCountLine(count: number, locale: string, showCount: boolean): string | undefined {
  if (count === 0) {
    return phrase(locale, "jobList.empty");
  }

  if (!showCount) {
    return undefined;
  }

  return phrase(locale, count === 1 ? "jobList.count.one" : "jobList.count.other", [String(count)]);
}

type CardOptions = {
  showDeadline: boolean;
};

function getCard(position: SitePosition, index: number, options: CardOptions, locale: string): JobCard {
  return {
    number: index < 9 ? `0${index + 1}` : String(index + 1),
    variant: (index % VARIANTS) + 1,
    title: position.title,
    unit: position.unit || undefined,
    details: joinDetails([position.location, position.employmentType]),
    deadline:
      options.showDeadline && position.deadline
        ? phrase(locale, "jobList.deadline", [formatDate(position.deadline, locale)])
        : undefined,
    // Always the posting on this page, where the application form is. The article from Next (readMoreUrl) isn't linked
    detailUrl: thisPageUrl({ [DETAIL_PARAM]: position.id }),
    imageUrl: position.imageInCard ? position.imageUrl : undefined,
  };
}

/**
 * The posting: the summary, the responsibilities and the requirements, and
 * what the admin tool has turned on besides. The full description is with the
 * application form. The deadline is always shown here: it matters when you
 * consider applying
 */
function getDetail(
  position: SitePosition,
  locale: string,
  { display, applyOnSite }: { display: CareerDisplay; applyOnSite: boolean },
): JobDetail {
  const sections: JobSection[] = [
    { heading: phrase(locale, "jobList.responsibilities"), items: position.responsibilities },
    { heading: phrase(locale, "jobList.requirements"), items: position.requirements },
    {
      heading: phrase(locale, "jobList.niceToHave"),
      items: display.niceToHave ? position.niceToHave : [],
    },
  ].filter((section) => section.items.length > 0);

  return {
    details: joinDetails([position.unit, position.location, position.employmentType]),
    deadline: position.deadline
      ? phrase(locale, "jobList.deadline", [formatDate(position.deadline, locale)])
      : phrase(locale, "jobList.ongoing"),
    bannerUrl: display.banner ? position.bannerUrl : undefined,
    summary: position.summary,
    sections,
    contact: display.contact ? getContact(position.contact, locale) : undefined,
    article: display.article ? getArticle(position.readMoreUrl, locale) : undefined,
    apply: phrase(locale, "jobList.apply"),
    // With the form on the page, the form itself follows the posting: no button to Next
    applyUrl: applyOnSite ? undefined : position.applyUrl,
  };
}

/** The page about the position from Next, e.g. an article on the site. The client only lets https addresses through */
function getArticle(url: string | undefined, locale: string): JobArticle | undefined {
  return url ? { url, label: phrase(locale, "jobList.article") } : undefined;
}

function getContact(contact: SiteContact | undefined, locale: string): JobContact | undefined {
  if (!contact) {
    return undefined;
  }

  // Only well-formed values become links. The text is escaped in the view either way
  const email =
    contact.email && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(contact.email) ? contact.email : undefined;
  const phoneHref = contact.phone ? contact.phone.replace(/[^\d+]/g, "") : "";

  return {
    heading: phrase(locale, "jobList.contact"),
    name: contact.name,
    title: contact.title,
    email,
    phone: contact.phone,
    phoneHref: phoneHref.length >= 5 ? phoneHref : undefined,
  };
}

function joinDetails(values: (string | undefined)[]): string | undefined {
  const present = values.filter((value): value is string => !!value);

  return present.length > 0 ? present.join(" · ") : undefined;
}

function getEditorNotice(locale: string, status: JobListStatus): string | undefined {
  switch (status) {
    case "ok":
      return undefined;
    case "stale":
      return phrase(locale, "jobList.editor.stale");
    case "unavailable":
      return phrase(locale, "jobList.editor.unavailable");
    case "disabled":
      return phrase(locale, "jobList.editor.disabled");
    case "unconfigured":
      return phrase(locale, "jobList.editor.unconfigured");
  }
}
