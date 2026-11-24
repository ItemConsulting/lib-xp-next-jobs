import { getComponent } from "/lib/xp/portal";
import { getPageLocale } from "/lib/next-jobs/page";
import { getPageContributions } from "/lib/next-jobs/views/assets";
import { renderJobApply } from "/lib/next-jobs/views/job-apply";
import type { NextJobsApply } from ".";
import type { Request, Response } from "@enonic-types/core";

/**
 * The application form from `/lib/next-jobs`, for a site that has no
 * component of its own for it. It shows the form of the position the job
 * list on the same page has open, and nothing to visitors until then
 */
export function get(req: Request): Response {
  // Typed by the form alone: the name of the part has the app's name in it, which this file doesn't know
  const config = (getComponent() as { config?: Partial<NextJobsApply> } | null)?.config ?? {};

  return {
    body: renderJobApply({
      req,
      locale: getPageLocale(),
      heading: config.heading,
      text: config.text,
      receipt: config.receipt,
      surface: config.surface,
    }),
    pageContributions: getPageContributions(),
  };
}
