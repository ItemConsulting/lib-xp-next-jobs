import NextJobsForm from "./form";

/*
 * The script of the views from /lib/next-jobs, for a page that doesn't have
 * it in a bundle of its own: the parts load this file. A site with its own
 * bundle imports `./form` there and defines the element itself, as here.
 */
if (!window.customElements.get("next-jobs-form")) {
  window.customElements.define("next-jobs-form", NextJobsForm);
}
