/* ============================================================================
 * The look of the list of positions and the application form on a site.
 *
 * A site can set a few values in the admin tool: three colors, the color of
 * the buttons, how round the corners are, the fonts of the titles and of the
 * text, and what a card does under the pointer. They reach the page as CSS
 * custom properties named `--next-jobs--*`, on the element a view marks with
 * `data-next-jobs-design`; the effect on the cards is the attribute
 * `data-next-jobs-hover` on the same element. A view reads them with its own
 * look as the fallback (`DEFAULT_DESIGN`), so nothing has to be set.
 *
 * A site with a look of its own gives the same properties values in its own
 * stylesheet, on the element with the mark: what the admin tool writes is in
 * the style attribute and goes before them. Besides the ones the tool sets
 * (brand, accent, focus, ink, muted, button, button-text, card-radius,
 * control-radius, font-title, font-text) a stylesheet can set the measures:
 * `--next-jobs--space` and `--next-jobs--space-wide` (between the parts of a
 * posting and of the form), `--next-jobs--side` and `--next-jobs--max-width`
 * (for a list that goes out to the edges of the page) and
 * `--next-jobs--scroll-offset` (the height of a menu that stays at the top).
 *
 * Only values of a known shape are let through: a hex color, a whole number,
 * a list of font names without quotes, one of the known effects. They are
 * written into attributes, so nothing else may get in.
 * ========================================================================== */

/** The colors a site can set, in the order the admin tool lists them */
export const COLOR_KEYS = ["brand", "accent", "ink", "button"] as const;

/**
 * How the views look when nothing is set: the fallbacks in the stylesheets in
 * views/ (change them together with these). An app with no look of its own
 * hands these to the admin tool, which shows them for a value that isn't the
 * site's own. The colors as `#rrggbb`, the corners in px
 */
export const DEFAULT_DESIGN = {
  brand: "#1e293b",
  accent: "#1d4ed8",
  ink: "#111827",
  button: "#1d4ed8",
  radius: 12,
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
  /** How round the corners of cards and panels are, in px */
  radius?: number;
  /** The font of the titles: the heading of the page and the title of each card. A list of font names */
  fontTitle?: string;
  /** The font of everything else. A list of font names */
  fontText?: string;
  /** What a card does under the pointer */
  hover?: CardHover;
};

/**
 * - `animation`: the image at the top of the card moves
 * - `card`: the whole card lifts, and all of it is the link to the position
 */
export type CardHover = "animation" | "card";

export const CARD_HOVERS: CardHover[] = ["animation", "card"];

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

/** Rounder than this, a card starts to look like a pill */
export const MAX_RADIUS = 28;

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
 */
export type ContrastRule = "under-white" | "on-white" | "under-best";

export const CONTRAST_RULES: Record<DesignColorKey, ContrastRule> = {
  brand: "under-white",
  accent: "on-white",
  ink: "on-white",
  button: "under-best",
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

/** A whole number of px from 0 to the limit, as a number or as typed in the form. Otherwise undefined */
export function normalizeRadius(value: unknown): number | undefined {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{1,2}$/.test(value.trim())
        ? Number(value)
        : NaN;

  return number >= 0 && number <= MAX_RADIUS && Math.floor(number) === number ? number : undefined;
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

  const radius = normalizeRadius(values.radius);

  if (radius !== undefined) {
    design.radius = radius;
    any = true;
  }

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

  if (clean.radius !== undefined) {
    variables["--next-jobs--card-radius"] = `${clean.radius}px`;
    variables["--next-jobs--control-radius"] = `${Math.min(clean.radius, MAX_CONTROL_RADIUS)}px`;
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

/** White or dark, whichever stands out more on the color */
export function getTextColorOn(background: string): string {
  return getContrast(WHITE, background) >= getContrast(DARK, background) ? WHITE : DARK;
}

/** The contrast the color gets where it is used, by its rule */
export function getContrastInUse(key: DesignColorKey, color: string): number {
  return CONTRAST_RULES[key] === "under-best" ? getContrast(getTextColorOn(color), color) : getContrast(WHITE, color);
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
