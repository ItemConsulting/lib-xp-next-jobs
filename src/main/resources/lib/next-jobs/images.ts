import { get as getContentByKey, query } from "/lib/xp/content";
import { run } from "/lib/xp/context";
import { imageUrl } from "/lib/xp/portal";
import { PROJECT_REPO_PREFIX, type NextSite } from "./site";

/* ============================================================================
 * The images of a site's content project that can be the graphic behind the
 * heading of the list.
 *
 * The admin tool lists them and stores the id of the one that is chosen. The
 * address of the image is made by XP when a page is drawn, for the branch the
 * page is in: an image that isn't published is not shown to visitors.
 * ========================================================================== */

/** The content type the image service of XP scales. A drawing (media:vector) is not one of them */
const IMAGE_TYPE = "media:image";

/** As many as a list to choose from can take. The images changed last are the ones listed */
export const MAX_IMAGES = 200;

/** Wide enough for the surface behind the heading on a large screen */
const GRAPHIC_WIDTH = 1600;

export type SiteImage = {
  id: string;
  /** The name of the content, the last part of its path: what the image service wants at the end of an address */
  name: string;
  displayName: string;
  /** The content path of the folder the image is in: /my-site/images */
  folder: string;
};

/**
 * The images of the site's project, the one changed last first. Runs as the
 * user who opened the tool, so nobody is shown an image they can't read. The
 * drafts are searched: an image is there before it is published
 */
export function listImages(site: NextSite): SiteImage[] {
  try {
    return run({ repository: PROJECT_REPO_PREFIX + site.project, branch: "draft" }, () =>
      query({
        query: `type = '${IMAGE_TYPE}'`,
        count: MAX_IMAGES,
        sort: "modifiedTime DESC",
      }).hits.map(toSiteImage),
    );
  } catch (e) {
    log.warning("next-jobs-images: could not search %s: %s", site.project, String(e));
    return [];
  }
}

/** The image in a branch of the site's project. Undefined when it isn't there, isn't an image, or can't be read by the user */
export function findImage(site: NextSite, id: string, branch: "master" | "draft"): SiteImage | undefined {
  try {
    return run({ repository: PROJECT_REPO_PREFIX + site.project, branch }, () => {
      const content = getContentByKey({ key: id });

      return content && content.type === IMAGE_TYPE ? toSiteImage(content) : undefined;
    });
  } catch (e) {
    log.warning("next-jobs-images: could not read an image in %s (%s): %s", site.project, branch, String(e));
    return undefined;
  }
}

/**
 * The address of the image on the page that is being drawn. Undefined when
 * the image isn't in the branch of the page, so a view never draws an image
 * that can't be loaded
 */
export function getGraphicUrl(id: string): string | undefined {
  try {
    const content = getContentByKey({ key: id });

    return content && content.type === IMAGE_TYPE
      ? imageUrl({ id: content._id, scale: `width(${GRAPHIC_WIDTH})` })
      : undefined;
  } catch (e) {
    log.warning("next-jobs-images: could not make the address of the graphic: %s", String(e));
    return undefined;
  }
}

/**
 * The address of the image under a page the admin serves (`pageUrl`, without a slash at the end), for the preview
 * in the admin tool, where there is no page to ask XP for the address from. It is the address `imageUrl()` makes,
 * without the part that names the version: the image service answers without it
 */
export function getPreviewGraphicUrl(pageUrl: string, image: SiteImage): string {
  return `${pageUrl}/_/image/${encodeURIComponent(image.id)}/width-${GRAPHIC_WIDTH}/${encodeURIComponent(image.name)}`;
}

function toSiteImage(content: { _id: string; _name: string; _path: string; displayName: string }): SiteImage {
  return {
    id: content._id,
    name: content._name,
    displayName: content.displayName,
    folder: content._path.substring(0, content._path.lastIndexOf("/")),
  };
}
