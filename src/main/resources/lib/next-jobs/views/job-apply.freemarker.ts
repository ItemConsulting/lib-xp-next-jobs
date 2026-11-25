export type JobApplyModel = {
  /** The panel behind the fields */
  surface: "grey" | "white" | "plain";
  /** Classes of the site's own on the outermost element */
  rootClass?: string;
  /** The class of a button: the site's own, or the one of this library */
  buttonClass: string;
  /** The colors and corners the site has set in the admin tool, as custom properties. Empty when it has set none */
  designStyle?: string;
  /** Why there is no form here. Only set outside live mode */
  editorNotice?: string;
  /** Left out when no position is open, or the position isn't in the list: visitors then see nothing */
  application?: JobApplication;
};

/** The application for the position that is open on the page (?stilling=<id>) */
export type JobApplication = {
  /** The anchor the cards in the job list and the redirect go to */
  id: string;
  /** The editor's heading, or «Søknad» */
  heading: string;
  /**
   * - `form`: the form from Next
   * - `received`: after sending: the receipt only
   * - `closed`: Next takes no applications for the position from here (any more)
   * - `external`: Next didn't answer with the form: a button to the form in Next
   */
  state: "form" | "received" | "closed" | "external";
  /** The receipt or the closed text */
  text?: string;
  /**
   * The full description of the position, folded until the candidate opens it. With `form` and `external`, and
   * only when Next sends a description
   */
  description?: JobDescription;
  /** The editor's text above the form, plain text. Only with `form` */
  intro?: string;
  form?: JobApplyForm;
  /** The form in Next, when sending from here fails */
  applyUrl: string;
  /** The text on the button to Next. Only with `external` */
  applyLabel?: string;
};

/** «Les hele stillingsbeskrivelsen»: the formatted description from Next, drawn by the view so every text is escaped */
export type JobDescription = {
  /** The text on the line that opens and closes the panel */
  label: string;
  blocks: JobRichBlock[];
};

/** A paragraph has one item. A list has one per list item */
export type JobRichBlock = {
  type: "p" | "ul" | "ol";
  items: JobRichRun[][];
};

/** A piece of text. A line break in it is kept by CSS */
export type JobRichRun = {
  text: string;
  bold: boolean;
  italic: boolean;
};

export type JobApplyForm = {
  /** The service that sends the application on to Next */
  action: string;
  positionId: string;
  /** Where the redirect back lands: the application's own anchor */
  anchor: string;
  /** Epoch millis as text, set on the server when the form was drawn. Next's bot check */
  startedAt: string;
  requiredNote: string;
  /**
   * Name and email first, then the fields from Next in its order. The fields
   * the tenant has added come last in their section, and the position's own
   * questions last of all, under a heading
   */
  fields: JobApplyField[];
  /** The form draws fields of the tenant's own: the submission then carries the mark that makes Next read them */
  hasCustomFields: boolean;
  /** The first, empty option of a list to choose from */
  chooseLabel: string;
  cv: JobApplyCv;
  /** The step above the form that reads the CV and fills in the fields. Only when Next has it on and the admin tool shows it */
  cvRead?: JobCvRead;
  /** For the From and To pickers in the rows */
  periods: JobPeriods;
  /** Left out when Next sends no text for the consent */
  talentPool?: string;
  privacyText: string;
  privacyUrl: string;
  privacyLinkLabel: string;
  submit: string;
  sending: string;
  /** The messages next to a field, used by the script */
  fieldMessages: { required: string; email: string; cv: string };
  /** One notice per outcome, shown above the button. The script shows the right one */
  notices: JobApplyNotice[];
  /** Set when the page comes back from sending without the script: what went wrong */
  outcome?: string;
  /** The field that was missing or wrong, with its message */
  errorField?: string;
  errorText?: string;
};

export type JobApplyField = {
  /**
   * The name Next takes. For rows, the key of the group (employments,
   * educations). For a field of the tenant's own, `cf.<id>`
   */
  key: string;
  /** For the id attributes: the key, with only letters, digits, - and _ */
  id: string;
  /**
   * `heading` is the heading of a section, not a field. `number`, `select`,
   * `radio`, `multi` and `checkbox` are only used by the tenant's own fields
   */
  kind:
    | "text"
    | "email"
    | "tel"
    | "url"
    | "textarea"
    | "rows"
    | "tags"
    | "number"
    | "select"
    | "radio"
    | "multi"
    | "checkbox"
    | "heading";
  label: string;
  required: boolean;
  /** Over both columns. The rest share a line two by two, as in Next */
  wide: boolean;
  help?: string;
  /** For `tags`: the help text when the script runs, instead of the comma rule */
  tagsHelp?: string;
  /** For `tags`: «Fjern {0}», the label of the button on each tag */
  removeTag?: string;
  autocomplete?: string;
  inputmode?: string;
  placeholder?: string;
  row?: JobApplyRow;
  addLabel?: string;
  /** For `select`, `radio` and `multi`: the value is the id Next takes */
  options?: { value: string; label: string }[];
  /** For `text` and `textarea` */
  maxlength?: number;
  /** For `number`: the limits as text, and `1` or `any` */
  min?: string;
  max?: string;
  step?: string;
};

/** One row of work experience or education: two text fields on top, the period below */
export type JobApplyRow = {
  first: { name: string; label: string };
  second: { name: string; label: string };
  from: { name: string; label: string };
  to: { name: string; label: string };
  /** «Jobber her nå» or «Pågår»: sets To to «nå» */
  ongoing: string;
  remove: string;
};

export type JobPeriods = {
  /** January to December in the page's language. The value is the number, 01–12 */
  months: string[];
  /** This year and 59 years back */
  years: string[];
  /** «{0}, måned» and «{0}, år»: the labels of the two lists */
  monthLabel: string;
  yearLabel: string;
};

export type JobCvRead = {
  /** The service that sends the CV to Next to be read */
  action: string;
  heading: string;
  intro: string;
  question: string;
  /** In Next's order on the page: «Med KI» first when it is there. «local» is checked */
  readers: { value: string; label: string; heading: string; text: string }[];
  dropLabel: string;
  dropHelp: string;
  chooseLabel: string;
  /** On the button once a file is chosen */
  chooseAgainLabel: string;
  /** Next's text about what happens to the file. Shown as it is */
  text: string;
  /** For the check before reading: «.pdf,.docx» */
  accept: string;
  maxBytes: number;
  /** The messages after reading, by key. The script picks one and puts the count in {0} */
  messages: { key: string; text: string }[];
};

export type JobApplyCv = {
  label: string;
  help: string;
  /** For the accept attribute: «.pdf,.docx» */
  accept: string;
  maxBytes: number;
};

export type JobApplyNotice = {
  outcome: string;
  text: string;
  /** A link to the form in Next with this text, after the message */
  linkLabel?: string;
};
