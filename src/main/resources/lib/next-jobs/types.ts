/* ============================================================================
 * The contract of the job API in Next (`@item/contract/site` in Next).
 *
 * Everything here is public: what the site gets is shown to everyone, so the
 * types are an allow list. A new field on the position is not sent until Next
 * adds it to the contract.
 *
 * The API leaves out fields without a value, but always sends the lists
 * (empty when there is nothing).
 * ========================================================================== */

/** The contact person on the posting */
export interface SiteContact {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

/** The base fields of `SitePosition`. Never sent alone: the list and the single lookup both return the whole position */
export interface SitePositionSummary {
  id: string;
  title: string;
  /** The department */
  unit: string;
  /** The day the position was last published, YYYY-MM-DD. Always present */
  datePosted: string;
  location?: string;
  employmentType?: string;
  /** Short description */
  summary?: string;
  /** Application deadline, YYYY-MM-DD. Without one: ongoing */
  deadline?: string;
  /** Full URL to the image. Needs no key, so it can go straight into an `<img>` */
  imageUrl?: string;
  /** The image goes on the card in the list, instead of the halftone stripe */
  imageInCard?: boolean;
  /**
   * Full URL to the banner for the top of the posting, in its own ratio: Next keeps a wider banner whole and
   * crops only one taller than 3:1. Independent of `imageUrl`; needs no key
   */
  bannerUrl?: string;
  /** A page about the position, e.g. an article on the site. Without it, the site shows the posting itself */
  readMoreUrl?: string;
  /** Full URL to the application form in Next */
  applyUrl: string;
}

/** A piece of text in `descriptionRich`. `\n` is a line break inside the paragraph or the list item */
export interface SiteRichRun {
  text: string;
  bold?: true;
  italic?: true;
}

/** A paragraph, or a bulleted (`ul`) or numbered (`ol`) list with one entry per item */
export type SiteRichBlock = { type: "p"; runs: SiteRichRun[] } | { type: "ul" | "ol"; items: SiteRichRun[][] };

/**
 * Formatted text as a structure. `v` is the version of the format: new kinds
 * of blocks get a new version, so a receiver can skip what it doesn't know
 */
export interface SiteRichText {
  v: 1;
  blocks: SiteRichBlock[];
}

/** The position with the whole posting */
export interface SitePosition extends SitePositionSummary {
  /** The full description as plain text: paragraphs and list items («• ») on separate lines */
  description?: string;
  /**
   * The same description as HTML. Not used here: the site draws
   * `descriptionRich` itself, so every text is escaped by the view
   */
  descriptionHtml?: string;
  /** The same description as a structure. Sent when `description` is */
  descriptionRich?: SiteRichText;
  requirements: string[];
  niceToHave: string[];
  responsibilities: string[];
  contact?: SiteContact;
}

export interface SitePositionsResponse {
  positions: SitePosition[];
}

export interface SiteError {
  error: string;
}

/* ----------------------------------------------------------------------------
 * The application from the site. Next owns the setup: which fields are asked
 * for, what the privacy text promises and the limits on the file. The site
 * draws the form from it with its own labels, and only forwards what the
 * candidate sends.
 * -------------------------------------------------------------------------- */

/**
 * The candidate's fields, besides name and email (always there, always
 * required). The names in the submission are the same as in Next's own form
 */
export type SiteApplyFieldKey =
  | "phone"
  | "location"
  | "currentTitle"
  | "currentEmployer"
  | "yearsExperience"
  | "linkedin"
  | "summary"
  | "employments"
  | "educations"
  | "skills"
  | "languages"
  | "certifications";

export interface SiteApplyField {
  key: SiteApplyFieldKey;
  /** Must be filled in. Otherwise the submission is turned down with `err.required.<key>` */
  required: boolean;
}

/** The answer from `GET /stillinger/{id}/skjema` */
export interface SiteApplyForm {
  positionId: string;
  title: string;
  /** In the order the form in Next shows them. Hidden fields are left out */
  fields: SiteApplyField[];
  /** The CV is optional. A file outside the limits isn't stored, but doesn't stop the application */
  cv: {
    maxBytes: number;
    /** With the dot (`.pdf`). The extension decides, not the MIME type */
    extensions: string[];
  };
  privacy: {
    /** The text under the form, filled in. Shown as it is */
    text: string;
    url: string;
  };
  /** The optional consent to keep the application longer, as a checkbox (`talentPool=on`) */
  talentPool: {
    text: string;
    months: number;
  };
  /**
   * The CV reading that fills in the form (`POST /stillinger/{id}/cv`). Only
   * there when it is turned on in Next; without it the privacy text doesn't
   * say that the CV is read
   */
  cvRead?: SiteCvReadSetup;
}

/**
 * Who reads the CV. `local` is rules on Next's own server and is always
 * there; `ai` sends the file to Anthropic (Claude). The candidate chooses,
 * and `local` is the default: the file never leaves the house unless chosen
 */
export type SiteCvReader = "local" | "ai";

export interface SiteCvReadSetup {
  /** The readers the candidate can choose between, `local` first */
  readers: SiteCvReader[];
  /** Stricter than `cv`: Word 97 (`.doc`) isn't read, and images only with `ai` */
  maxBytes: number;
  extensions: string[];
  /** The text at the field, filled in: what happens to the file. Shown as it is */
  text: string;
  /** With `ai` in `readers`: the name of the choice and what it means */
  ai?: { label: string; text: string };
  /** The name of the choice `local` */
  localLabel: string;
}

export interface SiteCvEmployment {
  employer: string;
  role: string;
  /** As in Next: `YYYY-MM`, `YYYY`, «nå» or empty */
  from: string;
  to: string;
  description?: string;
}

export interface SiteCvEducation {
  school: string;
  degree: string;
  from: string;
  to: string;
}

/** The draft the reading suggests. Everything is optional, and an empty draft is allowed */
export interface SiteCvDraft {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  currentTitle?: string;
  currentEmployer?: string;
  yearsExperience?: number;
  summary?: string;
  employments: SiteCvEmployment[];
  educations: SiteCvEducation[];
  certifications: string[];
  languages: string[];
  skills: string[];
}

/** `200` from the CV reading. Nothing is stored: the file is sent again with the application */
export interface SiteCvRead {
  draft: SiteCvDraft;
  /** How many fields the draft fills. 0 means nothing was found */
  count: number;
}

/** `202` from the submission. On purpose, it doesn't say whether anything was written */
export interface SiteApplyReceipt {
  status: "received";
}

/** An error from the submission. `field` is set when a required field is missing */
export interface SiteApplyError extends SiteError {
  field?: SiteApplyFieldKey | "name" | "email";
}
