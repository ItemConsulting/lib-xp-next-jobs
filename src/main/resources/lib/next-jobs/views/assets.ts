import { assetUrl } from "/lib/enonic/asset";
import type { Response } from "@enonic-types/core";

/**
 * The stylesheet and the script of the views, for a component that brings
 * them along itself. A site that has them in its own bundles (it imports
 * `assets/next-jobs/next-jobs.css` and defines `<next-jobs-form>`) leaves
 * these out
 */
export function getPageContributions(): NonNullable<Response["pageContributions"]> {
  return {
    headEnd: [
      `<link rel="stylesheet" href="${assetUrl({ path: "next-jobs/next-jobs.min.css" })}">`,
      // A module is fetched once however many components ask for it, and runs after the page is read
      `<script type="module" src="${assetUrl({ path: "next-jobs/next-jobs.mjs" })}"></script>`,
    ],
  };
}
