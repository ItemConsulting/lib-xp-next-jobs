/**
 * The application form under a job posting.
 *
 * Sends the form with fetch to the site's own services (never to Next), so the
 * candidate keeps what they wrote when something is missing. When Next has the
 * CV reading on, choosing a CV reads it and fills in the fields that are still
 * empty. The rows for work and education, the period pickers and the tags only
 * work with this script; without it the form has plain fields and posts the
 * usual way.
 */

type Answer = {
  outcome?: string;
  field?: string;
  redirect?: string;
};

type Period = { from: string; to: string };

type CvDraft = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  currentTitle?: string;
  currentEmployer?: string;
  yearsExperience?: number;
  summary?: string;
  employments?: ({ employer: string; role: string } & Period)[];
  educations?: ({ school: string; degree: string } & Period)[];
  certifications?: string[];
  languages?: string[];
  skills?: string[];
};

type CvAnswer = {
  outcome?: string;
  error?: string;
  draft?: CvDraft;
};

const FIELD_OUTCOMES = ["required", "email", "cv"];
const TEXT_KEYS = [
  "name",
  "email",
  "phone",
  "location",
  "linkedin",
  "currentTitle",
  "currentEmployer",
  "yearsExperience",
  "summary",
] as const;
const TAG_KEYS = ["skills", "languages", "certifications"] as const;
/** «Jobber her nå» and «Pågår», as Next writes it */
const ONGOING = "nå";

export default class NextJobsForm extends HTMLElement {
  cleanup: () => void = () => {};
  sending = false;
  /** Counts the readings, so an old answer never fills in over a newer file */
  reading = 0;
  rowCount = 0;

  connectedCallback(): void {
    const form = this.querySelector("form");

    if (!form) {
      return;
    }

    form.querySelectorAll<HTMLElement>("[data-script-only]").forEach((element) => {
      element.hidden = false;
    });
    form.querySelectorAll<HTMLButtonElement>("[data-add-row]").forEach((button) => {
      button.hidden = false;
    });
    form.querySelectorAll<HTMLElement>("[data-script-help]").forEach((help) => {
      help.textContent = help.dataset.scriptHelp ?? help.textContent;
    });
    form.querySelectorAll<HTMLElement>("[data-tags]").forEach((tags) => {
      this.startTags(tags);
    });
    form.querySelectorAll<HTMLElement>("[data-rows-required='true']").forEach((rows) => {
      this.addRow(rows);
    });
    this.showReaderText(form);

    const onSubmit = (event: SubmitEvent): void => {
      event.preventDefault();
      void this.send(form);
    };

    const onClick = (event: MouseEvent): void => {
      const target = event.target as Element | null;
      const add = target?.closest<HTMLButtonElement>("[data-add-row]");
      const remove = target?.closest<HTMLButtonElement>("[data-remove-row]");
      const removeTag = target?.closest<HTMLButtonElement>("[data-remove-tag]");

      if (add) {
        const fieldset = add.closest<HTMLElement>("fieldset");
        const row = fieldset ? this.addRow(fieldset) : undefined;

        row?.querySelector("input")?.focus();
      } else if (remove) {
        const fieldset = remove.closest("fieldset");

        remove.closest("[data-row]")?.remove();
        fieldset?.querySelector<HTMLButtonElement>("[data-add-row]")?.focus();
      } else if (removeTag) {
        const tags = removeTag.closest<HTMLElement>("[data-tags]");

        removeTag.closest("li")?.remove();

        if (tags) {
          this.updateTagsRequired(tags);
          tags.querySelector("input")?.focus();
        }
      }
    };

    const onChange = (event: Event): void => {
      const input = event.target as HTMLInputElement;

      if (input.type === "file") {
        this.onFile(form);
      } else if (input.name === "leser") {
        this.showReaderText(form);

        // Reading again with the other choice, if a file is already there
        if (form.querySelector<HTMLInputElement>("input[type=file][name=cv]")?.files?.length) {
          this.onFile(form);
        }
      } else if (input.closest("[data-period]") || input.hasAttribute("data-period-ongoing")) {
        const row = input.closest<HTMLElement>("[data-row]");

        if (row) {
          this.updatePeriods(row);
        }
      } else if (input.getAttribute("aria-invalid") === "true" && input.value.trim() !== "") {
        this.clearFieldError(input.closest<HTMLElement>("[data-field]"));
      }
    };

    // What the candidate changes is theirs: a new reading leaves it alone
    const onInput = (event: Event): void => {
      const target = event.target as HTMLElement;

      target.removeAttribute("data-from-cv");
      target.closest("[data-row]")?.removeAttribute("data-from-cv");
    };

    const onKeydown = (event: KeyboardEvent): void => {
      const input = event.target as HTMLInputElement;
      const tags = input.closest<HTMLElement>("[data-tags]");

      if (tags && (event.key === "Enter" || event.key === ",")) {
        event.preventDefault();
        this.commitTags(tags);
      }
    };

    const onDragOver = (event: DragEvent): void => {
      const drop = (event.target as Element | null)?.closest<HTMLElement>(".next-jobs-form--drop");

      if (drop) {
        event.preventDefault();
        drop.classList.add("next-jobs-form--drop-over");
      }
    };

    const onDragLeave = (event: DragEvent): void => {
      (event.target as Element | null)?.closest(".next-jobs-form--drop")?.classList.remove("next-jobs-form--drop-over");
    };

    const onDrop = (event: DragEvent): void => {
      const drop = (event.target as Element | null)?.closest<HTMLElement>(".next-jobs-form--drop");
      const input = drop?.querySelector<HTMLInputElement>("input[type=file]");
      const file = event.dataTransfer?.files[0];

      if (!drop || !input || !file) {
        return;
      }

      event.preventDefault();
      drop.classList.remove("next-jobs-form--drop-over");

      const transfer = new DataTransfer();

      transfer.items.add(file);
      input.files = transfer.files;
      this.onFile(form);
    };

    form.addEventListener("submit", onSubmit);
    form.addEventListener("click", onClick);
    form.addEventListener("change", onChange);
    form.addEventListener("keydown", onKeydown);
    form.addEventListener("input", onInput);
    form.addEventListener("dragover", onDragOver);
    form.addEventListener("dragleave", onDragLeave);
    form.addEventListener("drop", onDrop);

    this.cleanup = () => {
      form.removeEventListener("submit", onSubmit);
      form.removeEventListener("click", onClick);
      form.removeEventListener("change", onChange);
      form.removeEventListener("keydown", onKeydown);
      form.removeEventListener("input", onInput);
      form.removeEventListener("dragover", onDragOver);
      form.removeEventListener("dragleave", onDragLeave);
      form.removeEventListener("drop", onDrop);
    };
  }

  disconnectedCallback(): void {
    this.cleanup();
  }

  /* ------------------------------ Sending -------------------------------- */

  async send(form: HTMLFormElement): Promise<void> {
    form.querySelectorAll<HTMLElement>("[data-tags]").forEach((tags) => {
      this.commitTags(tags);
    });

    if (this.sending || !this.checkCv(form)) {
      return;
    }

    const button = form.querySelector<HTMLButtonElement>("button[type=submit]");
    const label = button?.textContent ?? "";

    this.sending = true;
    this.showNotice(form, undefined);
    form.setAttribute("aria-busy", "true");

    if (button) {
      button.disabled = true;
      button.textContent = this.dataset.sending ?? label;
    }

    let answer: Answer;

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      answer = response.ok ? ((await response.json()) as Answer) : { outcome: "failed" };
    } catch (_e) {
      answer = { outcome: "failed" };
    }

    if (answer.outcome === "received" && answer.redirect) {
      // A new page with the receipt: a reload won't send the application again
      window.location.assign(answer.redirect);
      return;
    }

    this.sending = false;
    form.removeAttribute("aria-busy");

    if (button) {
      button.disabled = false;
      button.textContent = label;
    }

    this.showOutcome(form, answer);
  }

  showOutcome(form: HTMLFormElement, answer: Answer): void {
    const outcome = answer.outcome ?? "failed";

    if (outcome === "closed") {
      // The position closed while the candidate was writing: the page says so
      window.location.reload();
      return;
    }

    this.showNotice(form, outcome);

    if (FIELD_OUTCOMES.indexOf(outcome) !== -1 && answer.field) {
      const message =
        outcome === "email" ? this.dataset.email : outcome === "cv" ? this.dataset.cv : this.dataset.required;
      const container = form.querySelector<HTMLElement>(`[data-field="${CSS.escape(answer.field)}"]`);

      this.setFieldError(container, message ?? "");
      container?.querySelector<HTMLElement>("input:not([type=hidden]), textarea")?.focus();
    }
  }

  /** Shows the notice for the outcome above the button, and hides the others */
  showNotice(form: HTMLFormElement, outcome: string | undefined): void {
    form.querySelectorAll<HTMLElement>("[data-outcome]").forEach((notice) => {
      notice.hidden = notice.dataset.outcome !== outcome;
    });
  }

  /* ---------------------------- The CV file ------------------------------ */

  /** The limits for the file that goes with the application. A file outside them would be dropped by Next */
  checkCv(form: HTMLFormElement): boolean {
    const input = form.querySelector<HTMLInputElement>("input[type=file][name=cv]");
    const file = input?.files?.[0];
    const container = input?.closest<HTMLElement>("[data-field]") ?? null;
    const error = form.querySelector<HTMLElement>(`#${CSS.escape(input?.id ?? "")}-error`);

    if (!input || !file) {
      this.clearFieldError(container, error);
      return true;
    }

    const ok = fits(file, Number(this.dataset.maxBytes ?? "0"), this.dataset.accept ?? "");

    if (ok) {
      this.clearFieldError(container, error);
    } else {
      this.setFieldError(container, this.dataset.cv ?? "", error);
      input.focus();
    }

    return ok;
  }

  onFile(form: HTMLFormElement): void {
    const card = form.querySelector<HTMLElement>("[data-cv-read]");
    const file = form.querySelector<HTMLInputElement>("input[type=file][name=cv]")?.files?.[0];

    this.reading++;
    // A reading still under way no longer counts, so its spinner goes too
    card?.removeAttribute("aria-busy");
    showChosenFile(card, file?.name);

    if (!this.checkCv(form) || !card || !file) {
      this.setCvStatus(card, undefined);
      return;
    }

    // The file goes with the application either way. Only the reading has stricter limits
    if (!fits(file, Number(card.dataset.cvMaxBytes ?? "0"), card.dataset.cvAccept ?? "")) {
      this.setCvStatus(card, "rejected");
      return;
    }

    void this.readCv(form, card, file);
  }

  async readCv(form: HTMLFormElement, card: HTMLElement, file: File): Promise<void> {
    const reading = this.reading;
    const body = new FormData();
    const reader = form.querySelector<HTMLInputElement>("input[name=leser]:checked")?.value ?? "local";

    body.append("positionId", form.querySelector<HTMLInputElement>("input[name=positionId]")?.value ?? "");
    body.append("leser", reader);
    body.append("cv", file, file.name);

    const wait = reader === "ai" ? "readingAi" : "readingLocal";

    this.setCvStatus(card, wait);
    this.setWait(card, wait, file.name);
    card.setAttribute("aria-busy", "true");

    let answer: CvAnswer;

    try {
      const response = await fetch(card.dataset.cvRead ?? "", {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      answer = response.ok ? ((await response.json()) as CvAnswer) : { outcome: "failed" };
    } catch (_e) {
      answer = { outcome: "failed" };
    }

    // A newer file or another choice came while this one was read
    if (reading !== this.reading) {
      return;
    }

    card.removeAttribute("aria-busy");

    switch (answer.outcome) {
      case "ok": {
        const filled = answer.draft ? this.fill(form, answer.draft) : 0;

        this.setCvStatus(card, filled > 0 ? "filled" : "none", String(filled));
        break;
      }
      case "closed":
        window.location.reload();
        break;
      case "unreadable":
        this.setCvStatus(
          card,
          answer.error === "err.cvDoc" ? "doc" : answer.error === "err.cvLocalImage" ? "localImage" : "unreadable",
        );
        break;
      case "rejected":
      case "unavailable":
      case "tooMany":
        this.setCvStatus(card, answer.outcome);
        break;
      default:
        this.setCvStatus(card, "failed");
    }
  }

  /** The text in the drop zone while reading, where the choice of file was. The status says the same to screen readers */
  setWait(card: HTMLElement, key: string, fileName: string): void {
    const title = card.querySelector<HTMLElement>("[data-wait-title]");
    const file = card.querySelector<HTMLElement>("[data-wait-file]");

    if (title) {
      title.textContent = card.querySelector<HTMLElement>(`[data-message="${key}"]`)?.textContent ?? "";
    }

    if (file) {
      file.textContent = fileName;
    }
  }

  /** The message under the file, from the texts the page has. {0} is the count */
  setCvStatus(card: HTMLElement | null, key: string | undefined, count?: string): void {
    const status = card?.querySelector<HTMLElement>(".next-jobs-form--cv-status");
    const text = key ? card?.querySelector<HTMLElement>(`[data-message="${key}"]`)?.textContent : "";

    if (status) {
      status.textContent = (text ?? "").replace("{0}", count ?? "");
      status.dataset.state = key ?? "";
    }
  }

  showReaderText(form: HTMLFormElement): void {
    const chosen = form.querySelector<HTMLInputElement>("input[name=leser]:checked")?.value ?? "local";

    form.querySelectorAll<HTMLElement>("[data-reader]").forEach((text) => {
      text.hidden = text.dataset.reader !== chosen;
    });
  }

  /* ------------------------- Filling in the draft ------------------------ */

  /**
   * Fills only what is still empty: what the candidate wrote stays. Returns how
   * many fields, rows and tags were filled, for the message
   */
  fill(form: HTMLFormElement, draft: CvDraft): number {
    let count = 0;

    this.clearPreviousDraft(form);

    TEXT_KEYS.forEach((key) => {
      const value = draft[key];
      const input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        `[data-field="${key}"] input[name="${key}"], [data-field="${key}"] textarea[name="${key}"]`,
      );

      if (input && !input.value.trim() && value !== undefined && String(value).trim()) {
        input.value = String(value);
        input.dataset.fromCv = "";
        count++;
      }
    });

    count += this.fillRows(
      form,
      "employments",
      (draft.employments ?? []).map((e) => ({ first: e.employer, second: e.role, from: e.from, to: e.to })),
    );
    count += this.fillRows(
      form,
      "educations",
      (draft.educations ?? []).map((e) => ({ first: e.school, second: e.degree, from: e.from, to: e.to })),
    );

    TAG_KEYS.forEach((key) => {
      const tags = form.querySelector<HTMLElement>(`[data-tags="${key}"]`);

      (draft[key] ?? []).forEach((value) => {
        if (tags && this.addTag(tags, value, true)) {
          count++;
        }
      });
    });

    return count;
  }

  /**
   * Takes away what an earlier reading filled in and the candidate hasn't
   * changed, so reading again (e.g. with AI after without) replaces it
   */
  clearPreviousDraft(form: HTMLFormElement): void {
    form
      .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[data-from-cv], textarea[data-from-cv]")
      .forEach((input) => {
        input.value = "";
        input.removeAttribute("data-from-cv");
      });

    form.querySelectorAll<HTMLElement>("[data-row][data-from-cv]").forEach((row) => {
      row.remove();
    });

    form.querySelectorAll<HTMLElement>("li[data-from-cv]").forEach((item) => {
      const tags = item.closest<HTMLElement>("[data-tags]");

      item.remove();

      if (tags) {
        this.updateTagsRequired(tags);
      }
    });
  }

  /** New rows for what isn't there already. The same two values are never added twice, in either order */
  fillRows(form: HTMLFormElement, key: string, rows: ({ first: string; second: string } & Period)[]): number {
    const fieldset = form.querySelector<HTMLElement>(`[data-field="${key}"]`);

    if (!fieldset) {
      return 0;
    }

    let count = 0;
    const pair = (first: string, second: string): string =>
      [first.trim().toLowerCase(), second.trim().toLowerCase()].sort().join("|");
    const existing = Array.from(fieldset.querySelectorAll<HTMLElement>("[data-row]")).map((row) =>
      pair(rowInput(row, "first")?.value ?? "", rowInput(row, "second")?.value ?? ""),
    );

    rows.forEach((values) => {
      if (existing.indexOf(pair(values.first, values.second)) !== -1) {
        return;
      }

      // An empty row the candidate added is used first
      const empty = Array.from(fieldset.querySelectorAll<HTMLElement>("[data-row]")).filter(
        (row) => !rowInput(row, "first")?.value.trim() && !rowInput(row, "second")?.value.trim(),
      )[0];
      const row = empty ?? this.addRow(fieldset);
      const first = row ? rowInput(row, "first") : null;
      const second = row ? rowInput(row, "second") : null;

      if (!row || !first || !second) {
        return;
      }

      first.value = values.first;
      second.value = values.second;
      // The row came from the reading. Typing in it marks it as the candidate's
      row.dataset.fromCv = "";
      this.setPeriods(row, values);
      existing.push(pair(values.first, values.second));
      count++;
    });

    return count;
  }

  /* ------------------------------- Rows ---------------------------------- */

  addRow(fieldset: HTMLElement): HTMLElement | undefined {
    const template = fieldset.querySelector<HTMLTemplateElement>("template[data-row-template]");
    const list = fieldset.querySelector("[data-row-list]");

    if (!template || !list) {
      return undefined;
    }

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const row = fragment.querySelector<HTMLElement>("[data-row]");
    const index = String(++this.rowCount);

    fragment.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      element.id = element.id.replace("__i__", index);
    });

    // A required group needs the first field of the first row
    if (fieldset.dataset.rowsRequired === "true" && !list.querySelector("[data-row]")) {
      rowInput(fragment, "first")?.setAttribute("required", "");
    }

    list.appendChild(fragment);

    return row ?? undefined;
  }

  /** Sets the pickers from «2020», «2020-03» or «nå» */
  setPeriods(row: HTMLElement, period: Period): void {
    const ongoing = row.querySelector<HTMLInputElement>("[data-period-ongoing]");

    row.querySelectorAll<HTMLElement>("[data-period]").forEach((end, index) => {
      const value = index === 0 ? period.from : period.to;
      const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
      const month = end.querySelector<HTMLSelectElement>("[data-period-month]");
      const year = end.querySelector<HTMLSelectElement>("[data-period-year]");

      if (month && year && match) {
        year.value = match[1];
        month.value = match[2] ?? "";
      }
    });

    if (ongoing) {
      ongoing.checked = period.to === ONGOING;
    }

    this.updatePeriods(row);
  }

  /** The hidden fields Next reads: «2020-03», «2020», «nå» or empty */
  updatePeriods(row: HTMLElement): void {
    const ongoing = row.querySelector<HTMLInputElement>("[data-period-ongoing]")?.checked ?? false;
    const ends = row.querySelectorAll<HTMLElement>("[data-period]");

    ends.forEach((end, index) => {
      const isTo = index === ends.length - 1;
      const month = end.querySelector<HTMLSelectElement>("[data-period-month]");
      const year = end.querySelector<HTMLSelectElement>("[data-period-year]");
      const hidden = end.querySelector<HTMLInputElement>("input[type=hidden]");

      if (!month || !year || !hidden) {
        return;
      }

      month.disabled = isTo && ongoing;
      year.disabled = isTo && ongoing;
      hidden.value =
        isTo && ongoing ? ONGOING : year.value ? (month.value ? `${year.value}-${month.value}` : year.value) : "";
    });
  }

  /* ------------------------------- Tags ---------------------------------- */

  /** The comma field becomes tags: each value its own hidden field, as Next takes them */
  startTags(tags: HTMLElement): void {
    const input = tags.querySelector<HTMLInputElement>("input[type=text]");

    if (!input) {
      return;
    }

    tags.dataset.name = input.name;
    tags.dataset.required = String(input.required);
    input.removeAttribute("name");
    this.commitTags(tags);
  }

  commitTags(tags: HTMLElement): void {
    const input = tags.querySelector<HTMLInputElement>("input[type=text]");

    if (!input) {
      return;
    }

    input.value.split(",").forEach((value) => this.addTag(tags, value));
    input.value = "";
  }

  /** False when the value is empty or already there */
  addTag(tags: HTMLElement, raw: string, fromCv = false): boolean {
    const value = raw.trim();
    const list = tags.querySelector("ul");
    const present = Array.from(tags.querySelectorAll<HTMLInputElement>("input[type=hidden]")).map((input) =>
      input.value.toLowerCase(),
    );

    if (!value || !list || present.indexOf(value.toLowerCase()) !== -1) {
      return false;
    }

    const item = document.createElement("li");
    const text = document.createElement("span");
    const remove = document.createElement("button");
    const hidden = document.createElement("input");

    item.className = "next-jobs-form--tag";

    if (fromCv) {
      item.dataset.fromCv = "";
    }
    text.textContent = value;
    remove.type = "button";
    remove.className = "next-jobs-form--tag-remove";
    remove.dataset.removeTag = "";
    remove.setAttribute("aria-label", (tags.dataset.removeLabel ?? "{0}").replace("{0}", value));
    remove.textContent = "×";
    hidden.type = "hidden";
    hidden.name = tags.dataset.name ?? "";
    hidden.value = value;
    item.append(text, remove, hidden);
    list.appendChild(item);
    this.updateTagsRequired(tags);

    return true;
  }

  /** A required list is filled when it has a tag, even with the text field empty */
  updateTagsRequired(tags: HTMLElement): void {
    const input = tags.querySelector<HTMLInputElement>("input[type=text]");
    const hasTags = tags.querySelector("input[type=hidden]") !== null;

    if (input && tags.dataset.required === "true") {
      input.required = !hasTags;
    }
  }

  /* ------------------------------ Errors --------------------------------- */

  setFieldError(container: HTMLElement | null, message: string, errorElement?: HTMLElement | null): void {
    const input = container?.querySelector<HTMLElement>("input:not([type=hidden]), textarea");
    const error = errorElement ?? findError(container, input);

    if (error) {
      error.textContent = message;
      error.hidden = false;
    }

    input?.setAttribute("aria-invalid", "true");
  }

  clearFieldError(container: HTMLElement | null, errorElement?: HTMLElement | null): void {
    const error =
      errorElement ?? findError(container, container?.querySelector<HTMLElement>("input:not([type=hidden]), textarea"));

    if (error) {
      error.textContent = "";
      error.hidden = true;
    }

    container?.querySelectorAll("[aria-invalid]").forEach((input) => {
      input.removeAttribute("aria-invalid");
    });
  }
}

/** The extension decides, not the type, as in Next */
function fits(file: File, maxBytes: number, accept: string): boolean {
  const extensions = accept.split(",").filter(Boolean);
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.substring(dot).toLowerCase() : "";

  return (maxBytes <= 0 || file.size <= maxBytes) && (extensions.length === 0 || extensions.indexOf(extension) !== -1);
}

/** The first or second text field of a row: employer and role, or school and degree */
function rowInput(row: ParentNode, which: "first" | "second"): HTMLInputElement | null {
  return row.querySelector<HTMLInputElement>(`input[id$="-${which}"]`);
}

/** The error under the field, or the one named after the input (the CV step has it outside the field) */
function findError(container: HTMLElement | null, input: HTMLElement | null | undefined): HTMLElement | null {
  return (
    container?.querySelector<HTMLElement>(".next-jobs-form--error") ??
    (input?.id ? document.getElementById(`${input.id}-error`) : null)
  );
}

/**
 * The drop zone with the file the candidate chose: its name in place of the
 * invitation, and «Velg en annen» on the button. Without a file, as at first
 */
function showChosenFile(card: HTMLElement | null, fileName: string | undefined): void {
  const drop = card?.querySelector<HTMLElement>(".next-jobs-form--drop");
  const name = drop?.querySelector<HTMLElement>("[data-drop-file]");
  const button = drop?.querySelector<HTMLElement>("[data-drop-button]");

  if (!drop || !name || !button) {
    return;
  }

  button.dataset.first ??= button.textContent ?? "";
  drop.classList.toggle("next-jobs-form--drop-chosen", Boolean(fileName));
  name.hidden = !fileName;
  name.textContent = fileName ?? "";
  button.textContent = fileName ? (button.dataset.again ?? "") : button.dataset.first;
}
