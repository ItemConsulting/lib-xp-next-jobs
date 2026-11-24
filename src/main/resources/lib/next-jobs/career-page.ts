import { query } from "/lib/xp/content";
import { run } from "/lib/xp/context";
import type { NextSite } from "./site";

/* ============================================================================
 * Finds the pages that can be the career page of a site: the content with the
 * component that lists the positions.
 *
 * Which component that is, is the app's own business: it can be a part, a
 * block in an option set, or something else. So the app gives the query that
 * finds its pages. A page is listed once: as published when it is, otherwise
 * as the draft.
 * ========================================================================== */

/** The repository of a content project is named after it */
const PROJECT_REPO_PREFIX = "com.enonic.cms.";

/** More pages than this with the component isn't expected in a project. The rest are left out of the choice */
const MAX_PAGES = 200;

export type CareerPage = {
  /** `<project>:<content id>`: what is stored when the page is chosen */
  key: string;
  /** The content project, as in the address of the admin's preview */
  project: string;
  branch: "master" | "draft";
  /** The content path, with the site first: /my-site/career/open-positions */
  path: string;
  displayName: string;
};

/**
 * Every page of the site that `pageQuery` finds, the published ones first,
 * each group with the page changed last on top. `pageQuery` is a content
 * query the app writes itself, never something a user has typed. Runs as the
 * user who opened the tool, so nobody is shown a page they can't read
 */
export function findCareerPages(site: NextSite, pageQuery: string): CareerPage[] {
  const pages: CareerPage[] = [];
  const branches: CareerPage["branch"][] = ["master", "draft"];

  branches.forEach((branch) => {
    findIn(site, branch, pageQuery).forEach((page) => {
      // The draft of a published page is the same page: it is already listed
      if (pages.filter((listed) => listed.key === page.key).length === 0) {
        pages.push(page);
      }
    });
  });

  return pages;
}

/** The chosen page when it is still among them, otherwise the first: the published page changed last */
export function pickCareerPage(pages: CareerPage[], chosen: string | undefined): CareerPage | undefined {
  return pages.filter((page) => page.key === chosen)[0] ?? pages[0];
}

function findIn(site: NextSite, branch: CareerPage["branch"], pageQuery: string): CareerPage[] {
  try {
    return run({ repository: PROJECT_REPO_PREFIX + site.project, branch }, () =>
      query({ query: pageQuery, count: MAX_PAGES, sort: "modifiedTime DESC" })
        .hits // The site itself or something under it. Checked here and not in the query, so no path is written into it
        .filter((hit) => hit._path === site.path || hit._path.indexOf(`${site.path}/`) === 0)
        .map((hit) => ({
          key: `${site.project}:${hit._id}`,
          project: site.project,
          branch,
          path: hit._path,
          displayName: hit.displayName,
        })),
    );
  } catch (e) {
    log.warning("next-jobs-page: could not search %s (%s): %s", site.project, branch, String(e));
    return [];
  }
}
