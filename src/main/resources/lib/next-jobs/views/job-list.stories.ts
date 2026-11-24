import { type Meta, type StoryObj } from "@itemconsulting/xp-storybook-utils";
import id from "./job-list.ftlh";
import "./button.css";
import "./job-list.css";
import type { JobListModel } from "./job-list.freemarker";

const meta: Meta<JobListModel> = {
  title: "Next jobs/Job list",
  parameters: {
    server: {
      id,
    },
  },
};

export default meta;

/** The look of the library, with nothing of a site's own. A site's look is in the stories of its own component */
const common = {
  id: "ledige_stillinger",
  title: "Ledige stillinger",
  headingLevel: 2,
  buttonClass: "next-jobs-button",
  listLabel: "Stillinger",
  readMore: "Les mer",
};

export const JobList: StoryObj<JobListModel> = {
  name: "Job list",
  args: {
    ...common,
    countLine: "3 ledige stillinger",
    text: "Velg en for å lese mer om rollen og hvordan du søker.",
    positions: [
      {
        number: "01",
        variant: 1,
        title: "Senior frontendutvikler",
        unit: "Teknologi",
        details: "Oslo / hybrid · Fast, 100 %",
        deadline: "Frist 1. des. 2026",
        detailUrl: "?stilling=p1",
      },
      {
        number: "02",
        variant: 2,
        title: "Key Account Manager",
        unit: "Salg",
        details: "Oslo",
        detailUrl: "?stilling=p2",
      },
      {
        number: "03",
        variant: 3,
        // Plain text from Next must come out escaped
        title: "<script>alert('xss')</script> Produktdesigner",
        detailUrl: "?stilling=p3",
      },
    ],
  },
};

export const Empty: StoryObj<JobListModel> = {
  name: "Empty",
  args: {
    ...common,
    countLine: "Ingen ledige stillinger akkurat nå. Ta gjerne en titt igjen senere.",
    editorNotice: "Bare synlig for redaktører: adressen eller nøkkelen til Next mangler i appens konfigurasjon.",
    positions: [],
  },
};

export const Detail: StoryObj<JobListModel> = {
  name: "Detail",
  args: {
    ...common,
    title: "Senior frontendutvikler",
    headingLevel: 1,
    backUrl: "?",
    backLabel: "Alle ledige stillinger",
    positions: [],
    detail: {
      details: "Teknologi · Oslo / hybrid · Fast, 100 %",
      deadline: "Frist 1. des. 2026",
      summary: "Vi ser etter en erfaren frontendutvikler som vil bygge løsninger for kundene våre.",
      sections: [
        { heading: "Arbeidsoppgaver", items: ["Utvikle brukergrensesnitt", "Kode-review"] },
        { heading: "Kvalifikasjoner", items: ["Erfaring med TypeScript", "God forståelse av CSS"] },
      ],
      contact: {
        heading: "Spørsmål om stillingen?",
        name: "Kari Nordmann",
        title: "Fagleder frontend",
        email: "kari@example.com",
        phone: "+47 900 00 000",
        phoneHref: "+4790000000",
      },
      article: { url: "https://example.com/karriere/senior-frontendutvikler", label: "Les mer om stillingen" },
      apply: "Åpne søknadsskjema",
      applyUrl: "https://item-next.vercel.app/soknad/p1",
    },
  },
};

export const Missing: StoryObj<JobListModel> = {
  name: "Missing",
  args: {
    ...common,
    title: "Stillingen er ikke ledig lenger",
    backUrl: "?",
    backLabel: "Alle ledige stillinger",
    positions: [],
    missing: {
      text: "Den kan være besatt, eller søknadsfristen kan ha gått ut. Se gjerne de andre ledige stillingene.",
    },
  },
};
