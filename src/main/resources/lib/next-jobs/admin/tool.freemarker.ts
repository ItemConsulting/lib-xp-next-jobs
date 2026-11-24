/** The page: the frame around it, and the cards of a site or the text that says there is no site */
export type CareerTool = CareerToolShell & (CareerToolBody | CareerToolEmpty);

/** What the page has whether or not there is a site to show */
export type CareerToolShell = {
  /** The language of the texts, for the page's lang attribute: «no» or «en» */
  lang: string;
  /** The name of the tool, from the app that has it */
  title: string;
  intro: string;
  /** The wordmark of Next in the header */
  logo: { url: string; alt: string };
  /** The mark of Next for the browser tab, the same file as Next's own tab icon */
  faviconUrl: string;
  /** The tool's own address: the form posts back to it */
  action: string;
  /** What the last action did. Shown above the form */
  notice?: CareerNotice;
  /** The site the cards are for. Every form sends it back, so a change is for this site. Empty when there is none */
  siteKey: string;
  /** The choice among the sites with the app. Left out when there is only one */
  sitePicker?: CareerSitePicker;
};

/** No site has the app, so there is nothing to set */
export type CareerToolEmpty = {
  /** The text that says so, in place of the cards */
  empty: string;
};

/** The cards the menu chooses among. The view has an id `tool-<section>` for each */
export type CareerSection = "settings" | "texts" | "display" | "design" | "positions" | "status";

export type CareerSitePicker = {
  label: string;
  /** The text on the button that shows the chosen site. The script hides it and shows the site as it is chosen */
  submit: string;
  options: CareerOption[];
};

/** The cards, for one site */
export type CareerToolBody = {
  /** The name of the menu on the left, for screen readers. Its points are the headings of the cards */
  navLabel: string;
  /** The card to show when the address names none: the one the last action was in */
  section: CareerSection;
  /** The career page in a frame beside the cards. Left out when the site has no page with the list of positions */
  preview?: CareerPreview;

  settingsHeading: string;
  baseUrl: CareerField;
  /** The API key of Next, beside the address it is sent to */
  apiKey: CareerSecret;
  /**
   * Set for a user who may not change the link to Next: the text that says so. The address is then shown as it
   * is, and there is no field for the key
   */
  connectionLocked?: string;
  maxPositions: CareerSelect;
  /** Which of the pages with the list of positions is the career page */
  careerPage: CareerSelect;
  /** The text on both save buttons. The script turns a button off while its form has nothing to save */
  save: string;

  displayHeading: string;
  displayHelp: string;
  /** What the site shows of what Next sends, one switch each */
  display: CareerToggle[];

  /** The colors and corners of the list and the form on the site */
  design: CareerDesignCard;

  /** The heading, the text and the count above the list on the site */
  texts: CareerTextsCard;

  positionsHeading: string;
  positionsHelp: string;
  /** Every position Next publishes, newest first. Empty when Next has none, or doesn't answer */
  positions: CareerPosition[];
  /** Why there is nothing to choose among. Set when `positions` is empty */
  positionsEmpty?: string;
  order: CareerOrder;

  statusHeading: string;
  /** The address in use, the key and the answer from Next */
  status: CareerStatusRow[];
  refresh: string;
  /** The text on the button that asks Next for the application form of each position */
  checkForms: string;
  /** The answers, when the page was opened with the check */
  formChecks?: CareerFormChecks;
};

/** What the script that moves the positions needs */
export type CareerOrder = {
  /** The ids in the order in use, joined with commas. «Lagre» is on when the rows stand in another order */
  saved: string;
  /** The limit of the list, or empty. The script marks the rows past it as they are moved */
  max: string;
  /** The text on the button that puts the rows back as Next has them */
  reset: string;
  /** The name of the handle to drag a row by */
  drag: string;
  /** Read out after a move, with %title%, %place% and %count% for the script to fill in */
  moved: string;
};

export type CareerFormChecks = {
  heading: string;
  /** When Next was asked */
  help: string;
  /** One row for each position: the title and what Next answered */
  rows: CareerStatusRow[];
  /** That there was nothing to check, or that only the first positions were checked */
  note?: string;
};

export type CareerPreview = {
  /** The page in the admin's «inline» mode, which is on the same host as the tool and may be framed */
  frameUrl: string;
  /** The page in the admin's «preview» mode, for a tab of its own */
  newTabUrl: string;
  /** The text on the button in the header. It is hidden while the preview is open */
  open: string;
  /** The name of the X in the preview, which has no text */
  close: string;
  heading: string;
  /** Under the heading: that the page is published, or that it isn't and the frame shows the draft */
  note: string;
  /** The name of the slider that sets the size of the page in the frame */
  zoom: string;
  /** The text after the slider, with %percent% and %width% for the script to fill in */
  zoomValue: string;
  /** The same for screen readers, in words */
  zoomValueText: string;
  reload: string;
  newTab: string;
  frameTitle: string;
};

export type CareerNotice = {
  /** `error` is announced at once, `done` politely */
  kind: "done" | "error";
  text: string;
};

export type CareerField = {
  label: string;
  help: string;
  /** What is in use, or what was typed when it was turned down */
  value: string;
  /** What is in use now. The save button is on when the field differs from it */
  saved: string;
  error?: string;
};

/**
 * A field for something secret. It has no value on purpose: what is stored is
 * never sent to the browser, and what was typed is not sent back
 */
export type CareerSecret = {
  label: string;
  /** Which key is in use, and what pasting one here does */
  help: string;
  error?: string;
  /** A key is in use, from here or from the .cfg file. The empty field then shows dots in place of it */
  masked: boolean;
  /** The label of the check box that removes the key stored here. Left out when none is stored */
  remove?: string;
};

export type CareerSelect = CareerField & {
  options: CareerOption[];
};

export type CareerOption = {
  value: string;
  label: string;
  selected: boolean;
};

export type CareerTextsCard = {
  heading: string;
  help: string;
  /** The heading of the list. Empty for the page's own */
  title: CareerField;
  titleMax: string;
  /** The text under the heading. Empty for the page's own */
  text: CareerField;
  textMax: string;
  /** Whether the number of positions is shown: the page's own choice, shown or hidden */
  count: CareerSelect;
};

export type CareerDesignCard = {
  heading: string;
  help: string;
  /** The text at the check box of a color: checked, the color is the site's own. Unchecked, the site's look applies */
  ownColor: string;
  /** The same for a value that isn't a color */
  ownValue: string;
  /** The least contrast before the warning shows, for the script */
  minContrast: string;
  /** The warning, with %ratio% for the script to fill in */
  warning: string;
  colors: CareerColor[];
  radius: CareerRadius;
  /** The fonts and the effect on the cards: each a list to choose from, with the site's own first */
  choices: CareerChoice[];
};

export type CareerChoice = {
  /** The name of the value in the settings and in the form */
  key: string;
  label: string;
  help: string;
  /** What is chosen now. Empty for the site's own */
  value: string;
  options: CareerOption[];
};

export type CareerColor = {
  /** The name of the color in the settings and in the form */
  key: string;
  label: string;
  help: string;
  /** The color is the site's own */
  own: boolean;
  /** `#rrggbb`: the site's own color, or what the app's views have when it has none */
  value: string;
  /** What the color is read against in the contrast check. See `ContrastRule` in /lib/next-jobs/design.ts */
  contrast: string;
  /** That text gets hard to read with the color. Only for a color of the site's own */
  warning?: string;
};

export type CareerRadius = {
  label: string;
  help: string;
  /** The value is the site's own */
  own: boolean;
  /** In px: the site's own value, or what the app's views have when it has none */
  value: string;
  max: string;
  /** The value with its unit, as it is now */
  text: string;
  /** The same with %px% for the script to fill in */
  valueText: string;
};

export type CareerToggle = {
  /** The name of the switch in the settings, and its value in the form */
  key: string;
  label: string;
  help: string;
  on: boolean;
};

export type CareerPosition = {
  id: string;
  title: string;
  /** Unit, location, employment type and deadline joined with « · ». Empty when Next sends none of them */
  details: string;
  /** With a check mark: the position is on the site */
  shown: boolean;
  /** The place Next gives the position, newest first, from 0 */
  defaultIndex: number;
  /** The position is on the site, but past the limit of the list */
  overLimit: boolean;
  /** The text that says so. Always there: the script shows and hides it as the rows are moved */
  note: string;
  /** The names of the two buttons that move the row */
  moveUp: string;
  moveDown: string;
};

export type CareerStatusRow = {
  label: string;
  value: string;
  /** `ok` and `problem` get a mark in front, so the color isn't the only sign */
  tone: "ok" | "problem" | "plain";
};
