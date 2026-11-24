import { query } from "/lib/xp/content";
import { get as getContext, run } from "/lib/xp/context";
import { getSite } from "/lib/xp/portal";
import { list as listRepos } from "/lib/xp/repo";

/* ============================================================================
 * Which site a call is for.
 *
 * One XP instance can have several sites with the app, and each can be its
 * own tenant in Next, with its own key and its own positions. So the settings,
 * the lists in memory and the calls to Next all belong to a site, named by a
 * key: `<project>:<id of the site content>`.
 *
 * Code that runs on a page or in a service asks for the site it is on. The
 * admin tool has no site around it, so it lists them and lets the user choose.
 * ========================================================================== */

/** The repository of a content project is named after it */
const PROJECT_REPO_PREFIX = "com.enonic.cms.";

/** More sites than this with the app isn't expected. The rest are left out of the choice */
const MAX_SITES = 100;

export type NextSite = {
  /** `<project>:<id of the site content>`: what the settings are stored under */
  key: string;
  /** The content project, as in the address of the admin's preview */
  project: string;
  /** The id of the site content */
  id: string;
  /** The content path of the site: /my-site */
  path: string;
  displayName: string;
};

/** A key as it is stored and looked up: two parts of letters, digits, _ and -. Otherwise undefined */
export function normalizeSiteKey(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();

  return /^[\w-]{1,100}:[\w-]{1,100}$/.test(trimmed) ? trimmed : undefined;
}

/**
 * The key of the site the request is on. Empty when there is none, as in the
 * admin tool: the caller then gets the defaults and what the .cfg file has
 */
export function getCurrentSiteKey(): string {
  try {
    const site = getSite();
    const repository = getContext().repository ?? "";

    if (!site || repository.indexOf(PROJECT_REPO_PREFIX) !== 0) {
      return "";
    }

    return normalizeSiteKey(`${repository.substring(PROJECT_REPO_PREFIX.length)}:${site._id}`) ?? "";
  } catch (_e) {
    // Outside a portal request there is no site to ask for
    return "";
  }
}

/**
 * Every site that has the app, by project and then by path. Each project is
 * searched as whoever calls this, so nobody is shown a site they can't read.
 * The drafts are searched: a site is there before it is published
 */
export function listSites(): NextSite[] {
  let repoIds: string[];

  try {
    // Only an administrator may list the repositories, and the tool has users who aren't. The names of the
    // content projects are all that is read this way
    repoIds = run({ principals: ["role:system.admin"] }, () => listRepos())
      .map((repo) => repo.id)
      .filter((id) => id.indexOf(PROJECT_REPO_PREFIX) === 0)
      .sort();
  } catch (e) {
    log.warning("next-jobs-site: could not list the content projects: %s", String(e));
    return [];
  }

  const sites: NextSite[] = [];

  repoIds.forEach((repoId) => {
    findIn(repoId).forEach((site) => sites.push(site));
  });

  return sites;
}

function findIn(repository: string): NextSite[] {
  const project = repository.substring(PROJECT_REPO_PREFIX.length);

  try {
    return run({ repository, branch: "draft" }, () =>
      query({
        query: `type = 'portal:site' AND data.siteConfig.applicationKey = '${app.name}'`,
        count: MAX_SITES,
        sort: "_path ASC",
      }).hits.map((hit) => ({
        key: `${project}:${hit._id}`,
        project,
        id: hit._id,
        path: hit._path,
        displayName: hit.displayName,
      })),
    ).filter((site) => normalizeSiteKey(site.key) !== undefined);
  } catch (e) {
    log.warning("next-jobs-site: could not search %s: %s", repository, String(e));
    return [];
  }
}
