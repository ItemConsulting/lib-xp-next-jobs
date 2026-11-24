import { getMultipartForm, getMultipartText } from "/lib/xp/portal";
import { getPositions } from "/lib/next-jobs/client";
import { getApplyForm, readCv, type CvReadResult } from "/lib/next-jobs/apply";
import { getCurrentSiteKey } from "/lib/next-jobs/site";
import { getApplicantAddress, getUploadedFile } from "/lib/next-jobs/upload";
import type { SiteCvReader } from "/lib/next-jobs/types";
import type { Request, Response } from "@enonic-types/core";

/* ============================================================================
 * Reads the candidate's CV through Next and gives the draft of the fields
 * back to the script on the page, which fills in the form.
 *
 * Nothing is stored and nothing of the CV or the draft is logged. The file is
 * sent again with the application, as Next expects. Only the script calls
 * this, so the answer is always JSON.
 * ========================================================================== */

/** What the script is told. «unreadable» comes with Next's code, e.g. «err.cvType» */
type Outcome = "ok" | "unreadable" | "rejected" | "unavailable" | "closed" | "tooLarge" | "tooMany" | "failed";

export function post(req: Request): Response {
  return json(handle(req, getMultipartText("positionId")?.trim() ?? ""));
}

function handle(req: Request, positionId: string): Record<string, unknown> & { outcome: Outcome } {
  if (!getMultipartForm() || !positionId) {
    return { outcome: "failed" };
  }

  // The site the form was on: its tenant in Next reads the CV
  const siteKey = getCurrentSiteKey();

  // Only positions on the list. Made-up ids never become calls to Next
  if (getPositions(siteKey).positions.filter((position) => position.id === positionId).length === 0) {
    return { outcome: "closed" };
  }

  const form = getApplyForm(siteKey, positionId, "nb");

  if (form.status === "closed") {
    return { outcome: "closed" };
  }

  const setup = form.status === "ok" ? form.form.cvRead : undefined;

  // The reading is off in Next, or Next can't be reached
  if (!setup) {
    return { outcome: "unavailable" };
  }

  const cv = getUploadedFile("cv", setup);

  if (cv === "rejected") {
    return { outcome: "rejected" };
  }

  if (!cv) {
    return { outcome: "unreadable", error: "err.cvMissing" };
  }

  const chosen = getMultipartText("leser");
  // Never out of the house unless the candidate chose it: anything but «ai» is read locally
  const reader: SiteCvReader = chosen === "ai" && setup.readers.indexOf("ai") !== -1 ? "ai" : "local";
  const address = getApplicantAddress(req);

  if (!address) {
    log.error("next-cv: no valid candidate address on the request (position=%s)", positionId);
    return { outcome: "failed" };
  }

  return toAnswer(readCv(siteKey, positionId, cv, reader, address));
}

function toAnswer(result: CvReadResult): Record<string, unknown> & { outcome: Outcome } {
  switch (result.status) {
    case "ok":
      return { outcome: "ok", draft: result.draft, count: result.count };
    case "unreadable":
      return { outcome: "unreadable", error: result.error };
    default:
      return { outcome: result.status };
  }
}

function json(body: Record<string, unknown>): Response {
  return {
    status: 200,
    contentType: "application/json",
    // The draft holds the candidate's details: never in a cache
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}
