import { serviceUrl } from "/lib/xp/portal";
import { render } from "/lib/freemarker";
import { toDesignStyle } from "../design";
import { getCareerDesign, getCareerDisplay } from "../settings";
import { getPositions } from "../client";
import { getApplyForm, type ApplyLanguage } from "../apply";
import { isEnglish } from "../dates";
import { APPLICATION_ANCHOR, DETAIL_PARAM, FIELD_PARAM, OUTCOME_PARAM, firstValue, getRequestedId } from "../page";
import { getCurrentSiteKey } from "../site";
import { phrase } from "./phrases";
import type { SiteApplyForm, SiteCvReadSetup, SitePosition, SiteRichRun, SiteRichText } from "../types";
import type {
  JobApplication,
  JobApplyField,
  JobApplyForm,
  JobApplyModel,
  JobCvRead,
  JobDescription,
  JobPeriods,
  JobRichBlock,
  JobRichRun,
} from "./job-apply.freemarker";
import type { Request } from "@enonic-types/core";

const view = resolve("job-apply.ftlh");

const OUTCOMES = ["received", "required", "email", "cv", "closed", "tooLarge", "tooMany", "failed"];

const SURFACES: JobApplyModel["surface"][] = ["grey", "white", "plain"];

/**
 * What the component that shows the form hands in: the presentation, which is
 * the site's own. Which fields the form has is Next's decision
 */
export type JobApplyOptions = {
  req: Request;
  /** The language of the page */
  locale: string;
  /** The heading on the form. Without it, «Søknad» */
  heading?: string;
  /** Plain text above the form */
  text?: string;
  /** Plain text shown after the application is sent, in place of the standard receipt */
  receipt?: string;
  /** The panel behind the fields: «grey», «white» or «plain». Anything else gives the grey one */
  surface?: string;
  /** Classes of the site's own on the outermost element */
  rootClass?: string;
  /** The site's own class for a button. Without it, the button of this library */
  buttonClass?: string;
};

/**
 * The application form from Next for the position that is open on the page
 * (?stilling=<id>), which the job list shows the posting of. Without a
 * position there is nothing to apply for, and visitors get an empty string
 */
export function renderJobApply(options: JobApplyOptions): string {
  const { req, locale } = options;
  const requested = getRequestedId(req.params[DETAIL_PARAM]);
  const isEditor = req.mode !== "live";
  // The settings and the positions are those of the site the page is on
  const siteKey = getCurrentSiteKey();
  const position =
    requested !== undefined
      ? getPositions(siteKey).positions.filter((candidate) => candidate.id === requested)[0]
      : undefined;
  const application = position ? getApplication(options, siteKey, position) : undefined;
  const editorNotice = isEditor ? getEditorNotice(locale, requested, application) : undefined;

  if (!application && !editorNotice) {
    return "";
  }

  return render<JobApplyModel>(view, {
    surface: getSurface(options.surface),
    rootClass: options.rootClass,
    buttonClass: options.buttonClass ?? "next-jobs-button",
    designStyle: toDesignStyle(getCareerDesign(siteKey)),
    editorNotice,
    application,
  });
}

/** Without a value, or with one that is no option, the form gets the grey panel */
function getSurface(surface: string | undefined): JobApplyModel["surface"] {
  const known = surface as JobApplyModel["surface"];

  return SURFACES.indexOf(known) !== -1 ? known : "grey";
}

/** Editors are told why there is no form, or why there is only a link to Next */
function getEditorNotice(
  locale: string,
  requested: string | undefined,
  application: JobApplication | undefined,
): string | undefined {
  if (requested === undefined) {
    return phrase(locale, "jobApply.editor.idle");
  }

  return application?.state === "external" ? phrase(locale, "jobApply.editor.unavailable") : undefined;
}

function getApplication(options: JobApplyOptions, siteKey: string, position: SitePosition): JobApplication {
  const params = options.req.params;
  const language = getLanguage(options.locale);
  const outcome = getOutcome(params[OUTCOME_PARAM]);
  const common = {
    id: APPLICATION_ANCHOR,
    heading: options.heading?.trim() || phrase(language, "jobApply.heading"),
    applyUrl: position.applyUrl,
  };

  // After sending: only the receipt, so the form isn't sent again by mistake
  if (outcome === "received") {
    return {
      ...common,
      state: "received",
      text: options.receipt?.trim() || phrase(language, "jobApply.received", [position.title]),
    };
  }

  const result = getApplyForm(siteKey, position.id, language);

  if (result.status === "closed" || outcome === "closed") {
    return { ...common, state: "closed", text: phrase(language, "jobApply.closed") };
  }

  // Shown while the candidate can still apply: above the form, or above the button to Next
  const description = getDescription(position, language);

  // Next can't be reached: the candidate can still apply in Next's own form
  if (result.status !== "ok") {
    return { ...common, state: "external", description, applyLabel: phrase(language, "jobApply.open") };
  }

  return {
    ...common,
    state: "form",
    description,
    intro: options.text?.trim() || undefined,
    form: getApplyFormModel(result.form, position, language, {
      showCvRead: getCareerDisplay(siteKey).cvRead,
      outcome,
      errorField: firstValue(params[FIELD_PARAM]),
    }),
  };
}

/**
 * The full description as blocks for the view. The formatted text when Next
 * sends it, otherwise the plain text as paragraphs: a list cached before the
 * formatting came has only that
 */
function getDescription(position: SitePosition, language: ApplyLanguage): JobDescription | undefined {
  const blocks = position.descriptionRich
    ? getRichBlocks(position.descriptionRich)
    : getPlainBlocks(position.description);

  return blocks.length > 0 ? { label: phrase(language, "jobApply.fullDescription"), blocks } : undefined;
}

/** The client has cleaned the structure. A paragraph becomes a block with one item, so the view has one shape */
function getRichBlocks(rich: SiteRichText): JobRichBlock[] {
  return rich.blocks.map((block) => ({
    type: block.type,
    items: (block.type === "p" ? [block.runs] : block.items).map(getRuns),
  }));
}

function getRuns(runs: SiteRichRun[]): JobRichRun[] {
  return runs.map((run) => ({ text: run.text, bold: run.bold === true, italic: run.italic === true }));
}

function getPlainBlocks(text: string | undefined): JobRichBlock[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => ({ type: "p" as const, items: [[{ text: line, bold: false, italic: false }]] }));
}

type FormOptions = {
  /** The admin tool shows the step that reads the CV. Next must have it on as well */
  showCvRead: boolean;
  outcome: string | undefined;
  errorField: string | undefined;
};

function getApplyFormModel(
  form: SiteApplyForm,
  position: SitePosition,
  language: ApplyLanguage,
  { showCvRead, outcome, errorField }: FormOptions,
): JobApplyForm {
  const fields: JobApplyField[] = [
    {
      key: "name",
      kind: "text",
      label: phrase(language, "jobApply.field.name"),
      required: true,
      wide: false,
      autocomplete: "name",
    },
    {
      key: "email",
      kind: "email",
      label: phrase(language, "jobApply.field.email"),
      required: true,
      wide: false,
      autocomplete: "email",
    },
  ];

  form.fields.forEach((field) => fields.push(getField(field.key, field.required, language)));

  const extensions = form.cv.extensions;
  const megabytes = getMegabytes(form.cv.maxBytes, language);
  const cvRule = phrase(language, "jobApply.cv.rule", [extensions.join(", "), megabytes]);
  const fieldMessages = {
    required: phrase(language, "jobApply.error.required"),
    email: phrase(language, "jobApply.error.email"),
    cv: cvRule,
  };
  const knownField = errorField && (errorField === "cv" || fields.some((field) => field.key === errorField));
  const shownOutcome = outcome && outcome !== "received" ? outcome : undefined;

  return {
    action: serviceUrl({ service: "next-apply" }),
    positionId: position.id,
    anchor: APPLICATION_ANCHOR,
    startedAt: String(Date.now()),
    requiredNote: phrase(language, "jobApply.requiredNote"),
    fields,
    cv: {
      label: phrase(language, "jobApply.cv.label"),
      help: cvRule,
      accept: extensions.join(","),
      maxBytes: form.cv.maxBytes,
    },
    // Without the step, the CV is an ordinary file field in the form
    cvRead: showCvRead && form.cvRead ? getCvRead(form.cvRead, language) : undefined,
    periods: getPeriods(language),
    talentPool: form.talentPool.text || undefined,
    privacyText: form.privacy.text,
    privacyUrl: form.privacy.url,
    privacyLinkLabel: phrase(language, "jobApply.privacyLink"),
    submit: phrase(language, "jobApply.submit"),
    sending: phrase(language, "jobApply.sending"),
    fieldMessages,
    notices: [
      { outcome: "required", text: phrase(language, "jobApply.notice.required") },
      { outcome: "email", text: phrase(language, "jobApply.notice.required") },
      { outcome: "cv", text: phrase(language, "jobApply.notice.required") },
      {
        outcome: "tooLarge",
        text: phrase(language, "jobApply.notice.tooLarge"),
        linkLabel: phrase(language, "jobApply.notice.link"),
      },
      {
        outcome: "tooMany",
        text: phrase(language, "jobApply.notice.tooMany"),
        linkLabel: phrase(language, "jobApply.notice.link"),
      },
      {
        outcome: "failed",
        text: phrase(language, "jobApply.notice.failed"),
        linkLabel: phrase(language, "jobApply.notice.link"),
      },
    ],
    outcome: shownOutcome,
    errorField: knownField ? errorField : undefined,
    errorText: knownField ? getFieldMessage(shownOutcome, fieldMessages) : undefined,
  };
}

function getFieldMessage(
  outcome: string | undefined,
  messages: { required: string; email: string; cv: string },
): string | undefined {
  switch (outcome) {
    case "email":
      return messages.email;
    case "cv":
      return messages.cv;
    case "required":
      return messages.required;
    default:
      return undefined;
  }
}

/** The labels are this library's, the same as Next uses. The two-by-two lines follow Next's form */
function getField(key: string, required: boolean, language: ApplyLanguage): JobApplyField {
  const label = phrase(language, `jobApply.field.${key}`);
  const common = { key, label, required, wide: false };

  switch (key) {
    case "phone":
      return { ...common, kind: "tel", autocomplete: "tel" };
    case "location":
      return { ...common, kind: "text", autocomplete: "address-level2" };
    case "currentTitle":
      return { ...common, kind: "text", autocomplete: "organization-title" };
    case "currentEmployer":
      return { ...common, kind: "text", autocomplete: "organization" };
    case "yearsExperience":
      return { ...common, kind: "text", inputmode: "numeric" };
    case "linkedin":
      return { ...common, kind: "url", autocomplete: "url", placeholder: "linkedin.com/in/…" };
    case "summary":
      return { ...common, kind: "textarea", wide: true, help: phrase(language, "jobApply.field.summary.help") };
    case "employments":
      return {
        ...common,
        kind: "rows",
        wide: true,
        row: getRow(language, ["empEmployer", "empRole", "empFrom", "empTo"], "jobApply.field.employments.ongoing"),
        addLabel: phrase(language, "jobApply.field.employments.add"),
      };
    case "educations":
      return {
        ...common,
        kind: "rows",
        wide: true,
        row: getRow(language, ["eduSchool", "eduDegree", "eduFrom", "eduTo"], "jobApply.field.educations.ongoing"),
        addLabel: phrase(language, "jobApply.field.educations.add"),
      };
    default:
      // skills, languages, certifications: tags with the script, a comma list without it. Next takes both
      return {
        ...common,
        kind: "tags",
        wide: key === "skills",
        help: phrase(language, "jobApply.field.tags.help"),
        tagsHelp: phrase(language, "jobApply.field.tags.helpScript"),
        removeTag: phrase(language, "jobApply.field.tags.remove"),
      };
  }
}

function getRow(language: ApplyLanguage, names: string[], ongoingKey: string): JobApplyField["row"] {
  const [first, second, from, to] = names.map((name) => ({ name, label: phrase(language, `jobApply.field.${name}`) }));

  return {
    first,
    second,
    from,
    to,
    ongoing: phrase(language, ongoingKey),
    remove: phrase(language, "jobApply.field.rows.remove"),
  };
}

const MONTHS_NB = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Months and years, not a date picker: a CV gives a year, or a month and a year, as in Next */
function getPeriods(language: ApplyLanguage): JobPeriods {
  const thisYear = new Date().getFullYear();
  const years: string[] = [];

  for (let i = 0; i < 60; i++) {
    years.push(String(thisYear - i));
  }

  return {
    months: language === "en" ? MONTHS_EN : MONTHS_NB,
    years,
    monthLabel: phrase(language, "jobApply.period.month"),
    yearLabel: phrase(language, "jobApply.period.year"),
  };
}

/** The step above the form. «Med KI» comes first on the page, as in Next, but «Uten KI» is checked */
function getCvRead(setup: SiteCvReadSetup, language: ApplyLanguage): JobCvRead {
  const local = {
    value: "local",
    label: setup.localLabel,
    heading: phrase(language, "jobApply.cvRead.localHeading"),
    text: phrase(language, "jobApply.cvRead.localText"),
  };
  const readers = setup.ai
    ? [
        {
          value: "ai",
          label: setup.ai.label,
          heading: phrase(language, "jobApply.cvRead.aiHeading"),
          text: setup.ai.text,
        },
        local,
      ]
    : [local];
  const megabytes = getMegabytes(setup.maxBytes, language);
  const messageKeys = [
    "readingAi",
    "readingLocal",
    "filled",
    "none",
    "rejected",
    "unreadable",
    "doc",
    "localImage",
    "unavailable",
    "tooMany",
    "failed",
  ];

  return {
    action: serviceUrl({ service: "next-cv" }),
    heading: phrase(language, "jobApply.cvRead.heading"),
    intro: phrase(language, "jobApply.cvRead.intro"),
    question: phrase(language, "jobApply.cvRead.question"),
    readers,
    dropLabel: phrase(language, "jobApply.cvRead.drop"),
    dropHelp: phrase(language, "jobApply.cvRead.limits", [setup.extensions.join(", "), megabytes]),
    chooseLabel: phrase(language, "jobApply.cvRead.choose"),
    chooseAgainLabel: phrase(language, "jobApply.cvRead.chooseAgain"),
    text: setup.text,
    accept: setup.extensions.join(","),
    maxBytes: setup.maxBytes,
    messages: messageKeys.map((key) => ({ key, text: phrase(language, `jobApply.cvRead.message.${key}`) })),
  };
}

/** «4,5», or «4.5» in English: megabytes with at most one decimal, rounded down so the limit is never shown as higher */
function getMegabytes(bytes: number, language: ApplyLanguage): string {
  const text = String(Math.floor((bytes / (1024 * 1024)) * 10) / 10);

  return language === "en" ? text : text.replace(".", ",");
}

/** English pages get the form in English from Next. Everything else is Norwegian */
function getLanguage(locale: string | undefined): ApplyLanguage {
  return isEnglish(locale) ? "en" : "nb";
}

function getOutcome(value: string | string[] | undefined): string | undefined {
  const first = firstValue(value);

  return first && OUTCOMES.indexOf(first) !== -1 ? first : undefined;
}
