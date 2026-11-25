import { type Meta, type StoryObj } from "@itemconsulting/xp-storybook-utils";
import id from "./job-apply.ftlh";
import "./button.css";
import "./job-apply.css";
import NextJobsForm from "../../../assets/next-jobs/form";
import type { JobApplyModel, JobApplication, JobDescription } from "./job-apply.freemarker";

if (!window.customElements.get("next-jobs-form")) {
  window.customElements.define("next-jobs-form", NextJobsForm);
}

const meta: Meta<JobApplyModel> = {
  title: "Next jobs/Job apply",
  parameters: {
    server: {
      id,
    },
  },
};

export default meta;

/** The look of the library, with nothing of a site's own. A site's look is in the stories of its own component */
const common: Pick<JobApplyModel, "surface" | "buttonClass"> = {
  surface: "grey",
  buttonClass: "next-jobs-button",
};

/** Folded above the form. Open it to see the formatting */
const description: JobDescription = {
  label: "Les hele stillingsbeskrivelsen",
  blocks: [
    {
      type: "p",
      items: [
        [
          { text: "Du blir en del av et ", bold: false, italic: false },
          { text: "tverrfaglig team", bold: true, italic: false },
          {
            text: " som bygger løsninger for kundene våre.\nVi jobber tett med designere.",
            bold: false,
            italic: false,
          },
        ],
      ],
    },
    {
      type: "ul",
      items: [
        [{ text: "Utvikle brukergrensesnitt", bold: false, italic: false }],
        // Text from Next must come out escaped
        [{ text: "<script>alert('xss')</script> Kode-review", bold: false, italic: true }],
      ],
    },
    {
      type: "ol",
      items: [
        [{ text: "Send søknaden", bold: false, italic: false }],
        [{ text: "Vi tar kontakt", bold: false, italic: false }],
      ],
    },
  ],
};

const application: JobApplication = {
  id: "soknad",
  heading: "Søknad",
  state: "form",
  description,
  applyUrl: "https://item-next.vercel.app/soknad/p1",
  form: {
    action: "#",
    positionId: "p1",
    anchor: "soknad",
    startedAt: "1794830000000",
    requiredNote: "Felt merket med * må fylles ut.",
    fields: [
      { key: "name", id: "name", kind: "text", label: "Navn", required: true, wide: false, autocomplete: "name" },
      { key: "email", id: "email", kind: "email", label: "E-post", required: true, wide: false, autocomplete: "email" },
      { key: "phone", id: "phone", kind: "tel", label: "Telefon", required: true, wide: false, autocomplete: "tel" },
      { key: "location", id: "location", kind: "text", label: "Bosted", required: false, wide: false },
      {
        key: "linkedin",
        id: "linkedin",
        kind: "url",
        label: "LinkedIn",
        required: false,
        wide: false,
        placeholder: "linkedin.com/in/…",
      },
      {
        key: "yearsExperience",
        id: "yearsExperience",
        kind: "text",
        label: "Års erfaring",
        required: false,
        wide: false,
      },
      {
        key: "summary",
        id: "summary",
        kind: "textarea",
        label: "Kort om deg",
        required: false,
        wide: true,
        help: "Hvorfor denne stillingen, og hva du tar med deg. Noen setninger holder.",
      },
      {
        key: "employments",
        id: "employments",
        kind: "rows",
        label: "Arbeidserfaring",
        required: false,
        wide: true,
        row: {
          first: { name: "empEmployer", label: "Arbeidsgiver" },
          second: { name: "empRole", label: "Stilling" },
          from: { name: "empFrom", label: "Fra" },
          to: { name: "empTo", label: "Til" },
          ongoing: "Jobber her nå",
          remove: "Fjern raden",
        },
        addLabel: "Legg til arbeidsforhold",
      },
      {
        key: "skills",
        id: "skills",
        kind: "tags",
        label: "Kompetanse",
        required: false,
        wide: true,
        help: "Skill med komma.",
        tagsHelp: "Skriv og trykk Enter for å legge til.",
        removeTag: "Fjern {0}",
      },
      {
        key: "languages",
        id: "languages",
        kind: "tags",
        label: "Språk",
        required: false,
        wide: false,
        help: "Skill med komma.",
        tagsHelp: "Skriv og trykk Enter for å legge til.",
        removeTag: "Fjern {0}",
      },
      {
        key: "cf.f_kort",
        id: "cf-f_kort",
        kind: "checkbox",
        label: "Har du førerkort klasse B?",
        required: false,
        wide: true,
      },
      { key: "position", id: "position", kind: "heading", label: "Spørsmål til deg", required: false, wide: true },
      {
        key: "cf.f_kontor",
        id: "cf-f_kontor",
        kind: "radio",
        label: "Hvilket kontor ønsker du?",
        required: true,
        wide: true,
        options: [
          { value: "o_1", label: "Oslo" },
          { value: "o_2", label: "Bergen" },
        ],
      },
      {
        key: "cf.f_start",
        id: "cf-f_start",
        kind: "date",
        label: "Når kan du begynne?",
        required: false,
        wide: false,
      },
      {
        key: "cf.f_lonn",
        id: "cf-f_lonn",
        kind: "number",
        label: "Hva er lønnskravet ditt (tusen kroner)?",
        required: false,
        wide: false,
        inputmode: "numeric",
        min: "0",
        step: "1",
      },
    ],
    hasCustomFields: true,
    chooseLabel: "Velg …",
    cv: { label: "CV", help: "Valgfri. .pdf, .docx, høyst 4 MB.", accept: ".pdf,.docx", maxBytes: 4194304 },
    cvRead: {
      action: "#",
      heading: "Har du en CV? Start med den",
      intro: "Vi leser CV-en og fyller ut skjemaet for deg. Du ser over og retter før du sender.",
      question: "Hvordan skal CV-en leses?",
      readers: [
        {
          value: "ai",
          label: "Med KI",
          heading: "Slik leses fila med KI",
          text: "Fila sendes til Anthropic, som leser den og svarer med forslag til feltene.",
        },
        {
          value: "local",
          label: "Uten KI",
          heading: "Slik leses fila uten KI",
          text: "Fila leses på vår egen server med enkle regler. Ingenting sendes ut av huset.",
        },
      ],
      dropLabel: "Velg CV-en din, eller slipp den her",
      dropHelp: ".pdf, .docx, inntil 4 MB. Lesingen starter med en gang.",
      chooseLabel: "Velg fil",
      chooseAgainLabel: "Velg en annen",
      text: "Fila leses for å fylle ut skjemaet, og følger med som CV-en din når du sender søknaden.",
      accept: ".pdf,.docx",
      maxBytes: 4194304,
      messages: [
        {
          key: "readingAi",
          text: "Leser CV-en og fyller ut skjemaet. Det tar vanligvis under ett minutt.",
        },
        { key: "readingLocal", text: "Leser CV-en og fyller ut skjemaet. Det tar noen sekunder." },
      ],
    },
    periods: {
      months: [
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
      ],
      years: ["2026", "2025", "2024", "2023", "2022", "2021", "2020"],
      monthLabel: "{0}, måned",
      yearLabel: "{0}, år",
    },
    talentPool: "Ta gjerne vare på søknaden min i 24 måneder, så Eksempel AS kan kontakte meg om andre stillinger.",
    privacyText:
      "Opplysningene brukes bare til denne rekrutteringen. Nettsiden sender søknaden videre og lagrer den ikke selv.",
    privacyUrl: "https://item-next.no/personvernerklaering",
    privacyLinkLabel: "Les personvernerklæringen",
    submit: "Send søknad",
    sending: "Sender …",
    fieldMessages: {
      required: "Fyll ut dette feltet.",
      email: "Skriv en gyldig e-postadresse.",
      cv: "Valgfri. .pdf, .docx, høyst 4 MB.",
    },
    notices: [
      { outcome: "required", text: "Noe mangler i søknaden. Se feltet som er merket." },
      {
        outcome: "failed",
        text: "Vi fikk ikke sendt søknaden. Prøv igjen om litt, eller",
        linkLabel: "søk i søknadsskjemaet vårt her.",
      },
    ],
    // As after sending without the script, with the phone missing
    outcome: "required",
    errorField: "phone",
    errorText: "Fyll ut dette feltet.",
  },
};

export const Form: StoryObj<JobApplyModel> = {
  name: "Form",
  args: {
    ...common,
    application,
  },
};

/** The editor's own heading and text, and the form without the panels */
export const EditorTexts: StoryObj<JobApplyModel> = {
  name: "Editor's texts, no panels",
  args: {
    ...common,
    surface: "plain",
    application: {
      ...application,
      heading: "Søk på stillingen",
      intro: "Vi leser søknadene fortløpende.\nTa gjerne kontakt om du lurer på noe.",
    },
  },
};

/** The editor has turned the CV step off: the CV is a file field in the form */
export const WithoutCvRead: StoryObj<JobApplyModel> = {
  name: "Without the CV reading",
  args: {
    ...common,
    surface: "white",
    application: {
      ...application,
      form: application.form && { ...application.form, cvRead: undefined, outcome: undefined, errorField: undefined },
    },
  },
};

export const Received: StoryObj<JobApplyModel> = {
  name: "Application received",
  args: {
    ...common,
    application: {
      id: "soknad",
      heading: "Søknad",
      state: "received",
      text: "Takk for søknaden. Søknaden din på Senior frontendutvikler er mottatt.",
      applyUrl: "https://item-next.vercel.app/soknad/p1",
    },
  },
};

export const Closed: StoryObj<JobApplyModel> = {
  name: "Closed",
  args: {
    ...common,
    application: {
      id: "soknad",
      heading: "Søknad",
      state: "closed",
      text: "Søknadsfristen er ute.",
      applyUrl: "https://item-next.vercel.app/soknad/p1",
    },
  },
};

/** Next didn't answer with the form. Editors also see why */
export const External: StoryObj<JobApplyModel> = {
  name: "Next unavailable",
  args: {
    ...common,
    editorNotice:
      "Bare synlig for redaktører: Next svarer ikke med skjemaet, så besøkende får en knapp til søknadsskjemaet i Next i stedet.",
    application: {
      id: "soknad",
      heading: "Søknad",
      state: "external",
      description,
      applyUrl: "https://item-next.vercel.app/soknad/p1",
      applyLabel: "Åpne søknadsskjema",
    },
  },
};

/** No position is open: visitors see nothing, editors see this */
export const Idle: StoryObj<JobApplyModel> = {
  name: "No position open (editors only)",
  args: {
    ...common,
    editorNotice:
      "Bare synlig for redaktører: søknadsskjemaet vises her når en stilling er åpnet fra «Ledige stillinger» på denne siden. Hvilke felt skjemaet har, bestemmes i Next.",
  },
};
