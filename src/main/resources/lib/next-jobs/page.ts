import { getContent, getSite } from "/lib/xp/portal";

/*
 * What the list of positions and the application form share on a page, whatever
 * components the app draws them with.
 */

/** The query parameter that opens one position: ?stilling=<id> */
export const DETAIL_PARAM = "stilling";

/**
 * The anchor of the application form. The cards in the job list link to it,
 * and the application service sends the candidate back to it
 */
export const APPLICATION_ANCHOR = "soknad";

/** The parts that show the list of positions and the application form, for a site with no components of its own for them */
export const LIST_PART = "next-jobs-list";
export const APPLY_PART = "next-jobs-apply";

/** The content query that finds the pages with the part that lists the positions, for the admin tool's choice of career page */
export const LIST_PART_QUERY = `components.part.descriptor = '${app.name}:${LIST_PART}'`;

/** Set by the application service on the way back: what happened to the application, and the field it was about */
export const OUTCOME_PARAM = "soknad";
export const FIELD_PARAM = "felt";

/** The id from the query parameter, or undefined when there is none. Only one value counts */
export function getRequestedId(value: string | string[] | undefined): string | undefined {
  const trimmed = firstValue(value)?.trim();

  return trimmed ? trimmed : undefined;
}

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The language of the page that is being shown: the content's own, otherwise the site's. Empty when neither has one */
export function getPageLocale(): string {
  return getContent()?.language ?? getSite()?.language ?? "";
}

type PageComponent = {
  type?: string;
  descriptor?: string;
  regions?: Record<string, { components?: PageComponent[] } | undefined>;
};

/**
 * Whether the page that is being shown has the part, also inside a layout.
 * Only the page set on the content itself is looked through: a part that
 * comes from a page template or a fragment isn't found
 */
export function pageHasPart(name: string): boolean {
  const page = (getContent() as { page?: PageComponent } | null)?.page;

  return page ? hasPart(page, `${app.name}:${name}`) : false;
}

function hasPart(component: PageComponent, descriptor: string): boolean {
  if (component.type === "part" && component.descriptor === descriptor) {
    return true;
  }

  const regions = component.regions ?? {};

  return Object.keys(regions).some((name) =>
    (regions[name]?.components ?? []).some((child) => hasPart(child, descriptor)),
  );
}
