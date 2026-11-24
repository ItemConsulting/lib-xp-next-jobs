import { getComponent } from "/lib/xp/portal";
import { APPLY_PART, getPageLocale, pageHasPart } from "/lib/next-jobs/page";
import { getPageContributions } from "/lib/next-jobs/views/assets";
import { renderJobList } from "/lib/next-jobs/views/job-list";
import type { NextJobsList } from ".";
import type { Request, Response } from "@enonic-types/core";

/** The anchor of the list on the page. The posting links back to it */
const ANCHOR = "stillinger";

/**
 * The list of positions and the posting from `/lib/next-jobs`, for a site
 * that has no component of its own for them. The look is the library's, with
 * what the site has set in the admin tool; the part brings the stylesheet and
 * the script along
 */
export function get(req: Request): Response {
  // Typed by the form alone: the name of the part has the app's name in it, which this file doesn't know
  const config = (getComponent() as { config?: Partial<NextJobsList> } | null)?.config ?? {};

  return {
    body: renderJobList({
      req,
      locale: getPageLocale(),
      id: ANCHOR,
      title: config.title ?? "",
      text: config.text,
      showCount: config.showCount,
      headingLevel: config.pageHeading ? 1 : 2,
      applyOnSite: pageHasPart(APPLY_PART),
    }),
    pageContributions: getPageContributions(),
  };
}
