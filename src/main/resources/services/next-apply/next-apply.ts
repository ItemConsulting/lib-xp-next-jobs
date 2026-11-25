import { getContent, getMultipartForm, getMultipartText, pageUrl } from "/lib/xp/portal";
import { getPositions } from "/lib/next-jobs/client";
import { getApplyForm, submitApplication, type ApplyPart, type SubmitResult } from "/lib/next-jobs/apply";
import { DETAIL_PARAM, FIELD_PARAM, OUTCOME_PARAM } from "/lib/next-jobs/page";
import { getCurrentSiteKey } from "/lib/next-jobs/site";
import { getApplicantAddress, getUploadedFile } from "/lib/next-jobs/upload";
import type { Request, Response } from "@enonic-types/core";

/* ============================================================================
 * Takes the application form from a job posting and sends it on to Next.
 *
 * Nothing is stored and nothing of the application is logged: the fields and
 * the file go straight from this request to Next. Jetty keeps the upload in a
 * temporary file only while the request lasts.
 *
 * The script on the page posts with `Accept: application/json` and gets the
 * outcome back, so the candidate keeps what they wrote. Without the script
 * the form posts the usual way, and the answer is a redirect back to the
 * posting (POST-redirect-GET), so a reload doesn't send it again.
 * ========================================================================== */

/**
 * The fields Next takes, with the same names as its own form. Nothing else is
 * sent on, but the fields the tenant has added in Next (`cf.<id>`), whose names
 * come from Next with the form
 */
const TEXT_FIELDS = [
  "name",
  "email",
  "phone",
  "location",
  "currentTitle",
  "currentEmployer",
  "yearsExperience",
  "linkedin",
  "summary",
  "skills",
  "languages",
  "certifications",
  "empEmployer",
  "empRole",
  "empFrom",
  "empTo",
  "eduSchool",
  "eduDegree",
  "eduFrom",
  "eduTo",
  "talentPool",
  // The bot check: the hidden field, and when the form was drawn on the server
  "website",
  "startedAt",
];

/** Sent by a form that drew the tenant's own fields, and sent on to Next, which then reads them */
const CUSTOM_MARK = "customFields";

/** What the page is told. The same words go in the query (OUTCOME_PARAM) when the script isn't running */
export type ApplyOutcome = "received" | "required" | "email" | "cv" | "closed" | "tooLarge" | "tooMany" | "failed";

type Answer = {
  outcome: ApplyOutcome;
  /** The form field to show the error at */
  field?: string;
};

export function post(req: Request): Response {
  const positionId = getText("positionId")?.trim() ?? "";
  // Only a fragment on the same page: letters, digits, _ and -
  const anchor = /^[\w-]{1,80}$/.test(getText("anchor") ?? "") ? (getText("anchor") as string) : "";
  const answer = handle(req, positionId);

  if (wantsJson(req)) {
    return {
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({
        outcome: answer.outcome,
        field: answer.field,
        redirect: answer.outcome === "received" ? backUrl(positionId, answer, anchor) : undefined,
      }),
    };
  }

  return {
    status: 303,
    headers: { Location: backUrl(positionId, answer, anchor), "Cache-Control": "no-store" },
  };
}

function handle(req: Request, positionId: string): Answer {
  if (!getMultipartForm() || !positionId) {
    return { outcome: "failed" };
  }

  // The site the form was on: its tenant in Next gets the application
  const siteKey = getCurrentSiteKey();
  // Only positions on the list. Made-up ids never become calls to Next
  const listed = getPositions(siteKey).positions.filter((position) => position.id === positionId).length > 0;

  if (!listed) {
    return { outcome: "closed" };
  }

  const form = getApplyForm(siteKey, positionId, "nb");

  if (form.status === "closed") {
    return { outcome: "closed" };
  }

  const cv = getUploadedFile("cv", form.status === "ok" ? form.form.cv : undefined);

  if (cv === "rejected") {
    return { outcome: "cv", field: "cv" };
  }

  const address = getApplicantAddress(req);

  if (!address) {
    log.error("next-apply: no valid candidate address on the request (position=%s)", positionId);
    return { outcome: "failed" };
  }

  const parts = getTextParts(TEXT_FIELDS);

  /*
   * The tenant's own fields, when the page drew them: only the names Next
   * gave for this position, and the mark that makes Next read them. Without
   * the mark from the page (a form drawn before the fields came) none are
   * sent, and Next lets the application through without them
   */
  if (form.status === "ok" && form.form.customFields.length > 0 && getText(CUSTOM_MARK) === "1") {
    parts.push({ name: CUSTOM_MARK, value: "1" });
    getTextParts(form.form.customFields.map((field) => field.name)).forEach((part) => parts.push(part));
  }

  if (cv) {
    parts.push(cv);
  }

  return toAnswer(submitApplication(siteKey, positionId, parts, address));
}

function toAnswer(result: SubmitResult): Answer {
  switch (result.status) {
    case "invalid":
      return { outcome: result.error === "err.emailInvalid" ? "email" : "required", field: result.field };
    default:
      return { outcome: result.status };
  }
}

/** Every value of the fields named, in the order they came. Repeated names (rows, tags, options) stay repeated */
function getTextParts(names: string[]): ApplyPart[] {
  const form = getMultipartForm();
  const parts: ApplyPart[] = [];

  names.forEach((name) => {
    const items = form[name];
    const count = Array.isArray(items) ? items.length : items ? 1 : 0;

    for (let i = 0; i < count; i++) {
      const value = getMultipartText(name, i);

      if (value !== null) {
        parts.push({ name, value });
      }
    }
  });

  return parts;
}

/** The posting again, on the page the form was on. The outcome tells the form what to show */
function backUrl(positionId: string, answer: Answer, anchor: string): string {
  const params: Record<string, string> = { [OUTCOME_PARAM]: answer.outcome };

  if (positionId) {
    params[DETAIL_PARAM] = positionId;
  }

  if (answer.field) {
    params[FIELD_PARAM] = answer.field;
  }

  const url = pageUrl({ id: getContent()?._id ?? "", params });

  return anchor ? `${url}#${anchor}` : url;
}

function getText(name: string): string | undefined {
  return getMultipartText(name) ?? undefined;
}

function wantsJson(req: Request): boolean {
  return (req.getHeader("Accept") ?? "").indexOf("application/json") !== -1;
}
