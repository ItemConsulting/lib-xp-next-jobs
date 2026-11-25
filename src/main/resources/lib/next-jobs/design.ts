/* ============================================================================
 * The look of the list of positions and the application form on a site.
 *
 * A site can set a few values in the admin tool: three colors, the color of
 * the buttons, the color behind it all, how round the corners are, the space
 * above and below, the fonts of the titles and of the text, what a card does
 * under the pointer, and a graphic behind the heading with how much of it
 * shows. They reach the page as CSS custom properties named `--next-jobs--*`,
 * on the element a view marks with `data-next-jobs-design`; the effect on the
 * cards and the graphic are the attributes `data-next-jobs-hover` and
 * `data-next-jobs-graphic` on the same element. A view reads them with its
 * own look as the fallback (`DEFAULT_DESIGN`), so nothing has to be set.
 *
 * A site with a look of its own gives the same properties values in its own
 * stylesheet, on the element with the mark: what the admin tool writes is in
 * the style attribute and goes before them. Besides the ones the tool sets
 * (brand, accent, focus, ink, muted, button, button-text, background,
 * card-radius, control-radius, margin, graphic-opacity, font-title,
 * font-text) a stylesheet can set the measures:
 * `--next-jobs--space` and `--next-jobs--space-wide` (between the parts of a
 * posting and of the form), `--next-jobs--side` and `--next-jobs--max-width`
 * (for a list that goes out to the edges of the page) and
 * `--next-jobs--scroll-offset` (the height of a menu that stays at the top).
 *
 * Only values of a known shape are let through: a hex color, a whole number,
 * a list of font names without quotes, one of the known effects and graphics.
 * They are written into attributes, so nothing else may get in. The image of
 * a graphic is stored as the id of a content, and its address is made by XP
 * when the page is drawn: it is never part of a style.
 * ========================================================================== */

/** The colors a site can set, in the order the admin tool lists them */
export const COLOR_KEYS = ["brand", "accent", "ink", "button", "background"] as const;

/**
 * How the views look when nothing is set: the fallbacks in the stylesheets in
 * views/ (change them together with these). An app with no look of its own
 * hands these to the admin tool, which shows them for a value that isn't the
 * site's own. The colors as `#rrggbb`, the corners and the margin in px, how
 * much of the graphic shows in percent. The views have no background of
 * their own, so the page's shows through: white stands for it in the tool
 */
export const DEFAULT_DESIGN = {
  brand: "#1e293b",
  accent: "#1d4ed8",
  ink: "#111827",
  button: "#1d4ed8",
  background: "#ffffff",
  radius: 12,
  margin: 0,
  graphicOpacity: 55,
};

export type DesignColorKey = (typeof COLOR_KEYS)[number];

export type CareerDesign = {
  /** The surface behind the heading and on the cards' images. The text on it is white */
  brand?: string;
  /** Links, chosen fields, the focus mark and small details */
  accent?: string;
  /** The text. Muted text and thin lines follow it */
  ink?: string;
  /** The background of the buttons. Their text is white or dark, whichever is easier to read */
  button?: string;
  /** The surface behind the list, the posting and the form. Without it, the page's own shows through */
  background?: string;
  /** How round the corners of cards and panels are, in px */
  radius?: number;
  /** The space above and below the list and the form, in px. Inside the background when there is one */
  margin?: number;
  /** The font of the titles: the heading of the page and the title of each card. A list of font names */
  fontTitle?: string;
  /** The font of everything else. A list of font names */
  fontText?: string;
  /** What a card does under the pointer */
  hover?: CardHover;
  /** What is drawn behind the heading of the list, instead of the site's own */
  graphic?: Graphic;
  /** The id of the image content, when the graphic is an image */
  graphicImage?: string;
  /** How much of the graphic shows, in percent. Also for the site's own, when it reads the property */
  graphicOpacity?: number;
};

/**
 * - `animation`: the image at the top of the card moves
 * - `card`: the whole card lifts, and all of it is the link to the position
 */
export type CardHover = "animation" | "card";

export const CARD_HOVERS: CardHover[] = ["animation", "card"];

/**
 * - `none`: nothing, also where the site has a decoration of its own
 * - `dots`, `lines`, `grid`, `rings`: a pattern the stylesheet of the list draws
 * - `image`: an image from the site's content (`graphicImage`)
 */
export type Graphic = "none" | "dots" | "lines" | "grid" | "rings" | "image";

export const GRAPHICS: Graphic[] = ["none", "dots", "lines", "grid", "rings", "image"];

/**
 * The measures a site sets with a slider: the most each can be, and how far
 * one step of the slider goes. Past 28 px a card starts to look like a pill
 */
export const RANGES = {
  radius: { max: 28, step: 1 },
  margin: { max: 160, step: 4 },
  graphicOpacity: { max: 100, step: 5 },
} as const;

export type DesignRangeKey = keyof typeof RANGES;

/** In the order the admin tool lists them */
export const RANGE_KEYS: DesignRangeKey[] = ["radius", "margin", "graphicOpacity"];

/** The two fonts a site can set, in the order the admin tool lists them */
export const FONT_KEYS = ["fontTitle", "fontText"] as const;

export type DesignFontKey = (typeof FONT_KEYS)[number];

/**
 * Fonts that need nothing loaded: every device has one of the fonts in each
 * list, or at least the kind the list ends with. A font the site loads itself
 * is added by the app that has the tool
 */
export const SYSTEM_FONTS: { key: string; family: string }[] = [
  { key: "sans", family: "system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif" },
  { key: "verdana", family: "Verdana, Geneva, Tahoma, sans-serif" },
  { key: "georgia", family: "Georgia, Times New Roman, serif" },
  { key: "palatino", family: "Palatino Linotype, Palatino, Book Antiqua, Georgia, serif" },
  { key: "rockwell", family: "Rockwell, Roboto Slab, Courier New, serif" },
  { key: "mono", family: "ui-monospace, Menlo, Consolas, Courier New, monospace" },
];

/** Longer than this is not a list of fonts someone chose */
const FONT_MAX_LENGTH = 200;

export const MAX_RADIUS = RANGES.radius.max;

/** The fields of a form are never rounder than this, however round the cards are */
const MAX_CONTROL_RADIUS = 9;

/** The least contrast for text that is easy to read (WCAG 2.1, level AA) */
export const MIN_CONTRAST = 4.5;

const WHITE = "#ffffff";
/** The dark text on a light button */
const DARK = "#1b1b33";

/** How much of the text color the muted text has */
const MUTED_PERCENT = 78;

/**
 * What a color is read against, for the contrast check:
 * - `under-white`: white text stands on it
 * - `on-white`: it is text on a white or nearly white surface
 * - `under-best`: the text on it is white or dark, whichever is better
 * - `under-text`: the text and the links of the site stand on it
 */
export type ContrastRule = "under-white" | "on-white" | "under-best" | "under-text";

export const CONTRAST_RULES: Record<DesignColorKey, ContrastRule> = {
  brand: "under-white",
  accent: "on-white",
  ink: "on-white",
  button: "under-best",
  background: "under-text",
};

/** `#rrggbb` in lower case. Otherwise undefined: no names, no short forms, no functions */
export function normalizeColor(value: unknown): string | undefined {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : "";

  return /^#[0-9a-f]{6}$/.test(trimmed) ? trimmed : undefined;
}

/**
 * A list of font names as it is written in CSS, without quotes: letters,
 * digits, spaces and hyphens, with a comma and a space between the names.
 * Nothing that can end the value or start another one gets through.
 * Otherwise undefined
 */
export function normalizeFont(value: unknown): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed.length <= FONT_MAX_LENGTH && /^[A-Za-z][A-Za-z0-9 -]*(, [A-Za-z][A-Za-z0-9 -]*)*$/.test(trimmed)
    ? trimmed
    : undefined;
}

/** One of the known effects. Otherwise undefined */
export function normalizeHover(value: unknown): CardHover | undefined {
  return CARD_HOVERS.filter((hover) => hover === value)[0];
}

/** One of the known graphics. Otherwise undefined */
export function normalizeGraphic(value: unknown): Graphic | undefined {
  return GRAPHICS.filter((graphic) => graphic === value)[0];
}

/**
 * The id of a content as XP writes it: letters, digits, hyphens, underscores
 * and full stops. It is only ever handed to XP to look the content up.
 * Otherwise undefined
 */
export function normalizeImageId(value: unknown): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";

  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(trimmed) ? trimmed : undefined;
}

/** A whole number from 0 to the limit of the measure, as a number or as typed in the form. Otherwise undefined */
export function normalizeRange(key: DesignRangeKey, value: unknown): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{1,3}$/.test(value.trim())
        ? Number(value)
        : NaN;

  return number >= 0 && number <= RANGES[key].max && Math.floor(number) === number ? number : undefined;
}

/** A whole number of px from 0 to the limit, as a number or as typed in the form. Otherwise undefined */
export function normalizeRadius(value: unknown): number | undefined {
  return normalizeRange("radius", value);
}

/** Only the known values, each of its known shape. Undefined when none is left */
export function cleanDesign(raw: unknown): CareerDesign | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const values = raw as Record<string, unknown>;
  const design: CareerDesign = {};
  let any = false;

  COLOR_KEYS.forEach((key) => {
    const color = normalizeColor(values[key]);

    if (color) {
      design[key] = color;
      any = true;
    }
  });

  RANGE_KEYS.forEach((key) => {
    const number = normalizeRange(key, values[key]);

    if (number !== undefined) {
      design[key] = number;
      any = true;
    }
  });

  FONT_KEYS.forEach((key) => {
    const font = normalizeFont(values[key]);

    if (font) {
      design[key] = font;
      any = true;
    }
  });

  const hover = normalizeHover(values.hover);

  if (hover) {
    design.hover = hover;
    any = true;
  }

  const graphic = normalizeGraphic(values.graphic);
  const image = normalizeImageId(values.graphicImage);

  // An image that isn't named is no graphic: the site's own applies
  if (graphic && (graphic !== "image" || image)) {
    design.graphic = graphic;
    any = true;

    if (graphic === "image") {
      design.graphicImage = image;
    }
  }

  return any ? design : undefined;
}

/**
 * The custom properties for what the site has set, and those that follow
 * from them. A value that isn't set gives no property, so the view's own
 * look applies. The script of the admin tool builds the same list for its
 * preview: change the two together
 */
export function getDesignVariables(design: CareerDesign): Record<string, string> {
  const clean = cleanDesign(design) ?? {};
  const variables: Record<string, string> = {};

  if (clean.brand) {
    variables["--next-jobs--brand"] = clean.brand;
  }

  if (clean.accent) {
    variables["--next-jobs--accent"] = clean.accent;
    variables["--next-jobs--focus"] = clean.accent;
  }

  if (clean.ink) {
    variables["--next-jobs--ink"] = clean.ink;
    variables["--next-jobs--muted"] = `color-mix(in srgb, ${clean.ink} ${MUTED_PERCENT}%, transparent)`;
  }

  if (clean.button) {
    variables["--next-jobs--button"] = clean.button;
    variables["--next-jobs--button-text"] = getTextColorOn(clean.button);
  }

  if (clean.background) {
    variables["--next-jobs--background"] = clean.background;
  }

  if (clean.radius !== undefined) {
    variables["--next-jobs--card-radius"] = `${clean.radius}px`;
    variables["--next-jobs--control-radius"] = `${Math.min(clean.radius, MAX_CONTROL_RADIUS)}px`;
  }

  if (clean.margin !== undefined) {
    variables["--next-jobs--margin"] = `${clean.margin}px`;
  }

  if (clean.graphicOpacity !== undefined) {
    // A share of one, as `opacity` is written: 55 percent is 0.55
    variables["--next-jobs--graphic-opacity"] = String(clean.graphicOpacity / 100);
  }

  if (clean.fontTitle) {
    variables["--next-jobs--font-title"] = clean.fontTitle;
  }

  if (clean.fontText) {
    variables["--next-jobs--font-text"] = clean.fontText;
  }

  return variables;
}

/** The properties as the value of a style attribute. Empty when the site has set nothing */
export function toDesignStyle(design: CareerDesign): string {
  const variables = getDesignVariables(design);

  return Object.keys(variables)
    .map((name) => `${name}:${variables[name]}`)
    .join(";");
}

/**
 * The effect on the cards the site has set, for the attribute
 * `data-next-jobs-hover`. Undefined when it has set none: the view's own
 * effect applies
 */
export function getDesignHover(design: CareerDesign): CardHover | undefined {
  return normalizeHover(design.hover);
}

/**
 * The graphic behind the heading the site has set, for the attribute
 * `data-next-jobs-graphic`. Undefined when it has set none: the site's own
 * decoration applies
 */
export function getDesignGraphic(design: CareerDesign): Graphic | undefined {
  return cleanDesign(design)?.graphic;
}

/** White or dark, whichever stands out more on the color */
export function getTextColorOn(background: string): string {
  return getContrast(WHITE, background) >= getContrast(DARK, background) ? WHITE : DARK;
}

/**
 * The contrast the color gets where it is used, by its rule. `text` is the
 * colors of the text and the links in use, for a color they stand on: the
 * lowest of them counts
 */
export function getContrastInUse(key: DesignColorKey, color: string, text: string[] = []): number {
  const rule = CONTRAST_RULES[key];

  if (rule === "under-text") {
    return text.reduce((lowest, textColor) => Math.min(lowest, getContrast(textColor, color)), 21);
  }

  return rule === "under-best" ? getContrast(getTextColorOn(color), color) : getContrast(WHITE, color);
}

/** The contrast between two `#rrggbb` colors, from 1 to 21 (WCAG 2.1) */
export function getContrast(first: string, second: string): number {
  const lighter = Math.max(getLuminance(first), getLuminance(second));
  const darker = Math.min(getLuminance(first), getLuminance(second));

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(color.substring(start, start + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
