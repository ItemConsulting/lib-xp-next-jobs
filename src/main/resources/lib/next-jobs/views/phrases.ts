import { localize } from "/lib/xp/i18n";

/** The bundle with the texts of the views and of the admin tool: `i18n/next-jobs.properties` */
const BUNDLES = ["i18n/next-jobs"];

/**
 * A text of the views, in the language of the page. Without a language, the
 * one XP finds for the request. The site's own phrases are never used here
 */
export function phrase(locale: string, key: string, values?: string[]): string {
  return localize({ key, locale: locale || undefined, values, bundles: BUNDLES });
}
