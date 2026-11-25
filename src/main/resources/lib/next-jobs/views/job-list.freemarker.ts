export type JobListModel = {
  /** The anchor of the list on the page */
  id: string;
  /** The heading of the list. In the detail view, the title of the position instead */
  title: string;
  /** 1 when the heading is the heading of the page, otherwise 2. The headings under it are one level down */
  headingLevel: number;
  /** Classes of the site's own on the outermost element */
  rootClass?: string;
  /** The class of a button: the site's own, or the one of this library */
  buttonClass: string;
  /** The colors and corners the site has set in the admin tool, as custom properties. Empty when it has set none */
  designStyle?: string;
  /** What a card does under the pointer, when the site has chosen: «animation» or «card». Without it, the view's own */
  designHover?: string;
  /** What is drawn behind the heading, when the site has chosen: «none», a pattern or «image». Without it, the site's own */
  designGraphic?: string;
  /** The address of the image, when the graphic is one. Made by XP, for the branch of the page */
  graphicImageUrl?: string;
  /** Why the list is empty or old. Only set outside live mode */
  editorNotice?: string;

  /** «4 ledige stillinger», or the text for an empty list. The first line under the title */
  countLine?: string;
  /** The text under the title, plain text */
  text?: string;
  listLabel: string;
  /** The text of the one link on each card */
  readMore: string;
  positions: JobCard[];

  /** Set when the page is opened with ?stilling=<id>: the view shows that position instead of the list */
  detail?: JobDetail;
  /** Set when ?stilling=<id> names a position that isn't in the list (any more) */
  missing?: JobMissing;
  /** The list without ?stilling. Set together with `detail` or `missing` */
  backUrl?: string;
  backLabel?: string;
};

export type JobCard = {
  /** «01», «02» … */
  number: string;
  /** 1–5 in turn, as a class on the card: a site can give the cards looks that differ */
  variant: number;
  title: string;
  unit?: string;
  /** Location and employment type joined with « · » */
  details?: string;
  /** «Frist 1. des. 2026». Left out when the admin tool hides it, or the position has no deadline */
  deadline?: string;
  /** The same page with ?stilling=<id>: the posting, and the application form when the page has it */
  detailUrl: string;
  /** The image from Next on the stripe, when Next says it goes on the card */
  imageUrl?: string;
};

export type JobDetail = {
  /** Unit, location and employment type joined with « · » */
  details?: string;
  /** «Frist 1. des. 2026», or «Løpende opptak» */
  deadline: string;
  /** The banner from Next. The ordinary image belongs to the card in the list and isn't shown here */
  bannerUrl?: string;
  /** The full description isn't here: the application form shows it, folded, above the form */
  summary?: string;
  /** Headed lists: responsibilities, requirements and, when the admin tool shows it, nice to have. Empty lists are left out */
  sections: JobSection[];
  /** The contact person, when the admin tool shows it and Next has one */
  contact?: JobContact;
  /** The page about the position from Next (readMoreUrl), when the admin tool shows it and Next has one */
  article?: JobArticle;
  apply: string;
  /** The form in Next. Left out when the page has the application form, which then follows the posting */
  applyUrl?: string;
};

export type JobSection = {
  heading: string;
  items: string[];
};

export type JobArticle = {
  url: string;
  label: string;
};

export type JobContact = {
  heading: string;
  name: string;
  title?: string;
  email?: string;
  /** Digits and + only, for the tel: link */
  phoneHref?: string;
  phone?: string;
};

export type JobMissing = {
  text: string;
};
