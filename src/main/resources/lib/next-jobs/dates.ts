/** Short months as Next writes them (nb-NO): «1. des. 2026». Nashorn has no Intl */
const MONTHS_NB = ["jan.", "feb.", "mars", "apr.", "mai", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "des."];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Whether a language tag is English: «en», «en-GB» … The texts and the dates
 * are in two languages, and everything that isn't English gets the Norwegian
 */
export function isEnglish(locale: string | undefined): boolean {
  return (locale ?? "").toLowerCase().indexOf("en") === 0;
}

/** YYYY-MM-DD to «1. des. 2026», or to «1 Dec 2026» for an English page */
export function formatDate(isoDate: string, locale?: string): string {
  const [year, month, day] = isoDate.split("-");

  return isEnglish(locale)
    ? `${parseInt(day, 10)} ${MONTHS_EN[parseInt(month, 10) - 1]} ${year}`
    : `${parseInt(day, 10)}. ${MONTHS_NB[parseInt(month, 10) - 1]} ${year}`;
}
