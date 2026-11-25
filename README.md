# lib-xp-next-jobs

Job openings from **Next**, Item's recruitment system, on an Enonic XP 7 site: the list of positions, the posting of
one position, the application form, and an admin tool where the site is set up.

Next is the source. XP stores no positions and no applications: the list is fetched from Next's job API and kept in
memory for a minute, and an application goes straight from the candidate's request to Next.

> [!NOTE]
> The library was taken out of `xp-item-web`, whose branches still have a copy of the code until the one that moves
> the app over to the library is merged. Until then, a change must be made in both places.

## What an app gets

| In the jar | What it is |
| --- | --- |
| `lib/next-jobs/` | The client for Next's API, the settings of each site, the views, and the admin tool |
| `site/parts/next-jobs-list/` | A part with the list of positions and the posting |
| `site/parts/next-jobs-apply/` | A part with the application form |
| `services/next-apply/`, `services/next-cv/` | The services the form posts to. They forward to Next and store nothing |
| `assets/next-jobs/` | The stylesheet and the script of the views, and the images of the admin tool |
| `i18n/next-jobs*.properties` | Every text, in Norwegian and English |

## Installing

In `build.gradle`:

```groovy
dependencies {
  include "no.item:lib-xp-next-jobs:0.1.0"
}

repositories {
  maven { url "https://repo.itemtest.no/releases" }
  // For lib-xp-freemarker, which the library uses in a snapshot version
  maven { url "https://repo.itemtest.no/snapshots" }
}
```

The libraries it calls (`lib-portal`, `lib-content`, `lib-node`, `lib-repo`, `lib-auth`, `lib-context`, `lib-i18n`,
`lib-http-client`, `lib-asset`, `lib-xp-freemarker`, `lib-xp-time`) come with it.

For the types, add `@item-enonic-types/lib-next-jobs` to `devDependencies` and a path of its own to the server
`tsconfig.json`, before a more general `/lib/*`:

```json
"paths": {
  "/lib/next-jobs/*": ["../../../node_modules/@item-enonic-types/lib-next-jobs/dist/lib/next-jobs/*"]
}
```

The package also has the stylesheets of the views and the script of the form, for an app that builds them into
bundles of its own (see "From a component of the app's own").

## Setting up

### 1. Start

Call the two at app start, in `main.ts`. The first makes the repository the settings are stored in, and the second
the role of the admin tool:

```ts
import { initToolRole } from "/lib/next-jobs/admin/access";
import { initCareerSettings } from "/lib/next-jobs/settings";

initCareerSettings();
initToolRole();
```

### 2. The link to Next

The address and the key of Next are set in the admin tool, for each site, or in the config file of the app
(`$XP_HOME/config/<app name>.cfg`), for every site that has none of its own:

| Key | Value |
| --- | --- |
| `nextJobs.baseUrl` | The address of Next, https, without `www` and without a slash at the end |
| `nextJobs.apiKey` | The key for the job API, made in Next under _Konfigurasjon → Stillinger på nettsiden_ |

Never put the key in the repo, in content or in a log.

### 3. The admin tool

The tool is in the library, but its descriptor and a controller of a few lines are the app's, since they say what is
the app's own. `admin/tools/next-jobs/next-jobs.xml`:

```xml
<tool xmlns="urn:enonic:xp:model:1.0">
  <display-name>Next jobs</display-name>
  <description>The career page and the link to Next</description>
  <allow>
    <principal>role:system.admin</principal>
    <principal>role:com.example.app.next-jobs</principal>
  </allow>
</tool>
```

`admin/tools/next-jobs/next-jobs.ts`:

```ts
import { DEFAULT_DESIGN } from "/lib/next-jobs/design";
import { LIST_PART_QUERY } from "/lib/next-jobs/page";
import { handleGet, handlePost, type ToolOptions } from "/lib/next-jobs/admin/tool";
import type { Request, Response } from "@enonic-types/core";

const options: ToolOptions = {
  title: "Next jobs",
  // The content query that finds the pages with the list of positions: here, those with the library's part
  careerPageQuery: LIST_PART_QUERY,
  // What the «Utseende» card shows for a value the site hasn't set. An app with a look of its own gives its
  // colors and corners here, and can leave out `background`, `margin` and `graphicOpacity`
  designDefaults: DEFAULT_DESIGN,
};

export function get(req: Request): Response {
  return handleGet(req, options);
}

export function post(req: Request): Response {
  return handlePost(req, options);
}
```

**Who gets in.** Administrators of XP (`system.admin`), and users with the role `<app name>.next-jobs`, which
`initToolRole()` makes. The role sets everything except the address of Next and the API key: whoever sets the address
decides where the key is sent, so the two stay with the administrators. A user with the role also needs
`system.admin.login`, and read access to the site.

**What it sets**, for one site at a time: the address and the key, how many positions the list shows, which positions
are hidden and their order, which page is the career page, what is shown of a position, the heading and text above
the list, and the look: the colors, the corners, the margin, the fonts, the effect on the cards and the graphic
behind the heading. It follows the language of the browser: Norwegian for someone who asks for it, otherwise English.

The settings are stored in the repository `<app name>.next-jobs`, one node for each site, closed to everyone but
`system.admin`. A key pasted into the tool is stored there as it is, so it is part of dumps and exports of that
repository.

## Showing the positions

### With the parts

Put «Job openings from Next» (`next-jobs-list`) on a page, and «Application form from Next» (`next-jobs-apply`) on
the same page to take applications there. Each card links to the posting on the same page (`?stilling=<id>`), with
the form under it. Without the form part, the posting ends with a button to the form in Next.

The parts load the stylesheet and the script themselves. The list finds the form among the page's own components: a
form that comes from a page template or a fragment isn't found, and the posting then also has the button to Next.

The labels of the parts' forms are in English in the descriptors. For other languages, add the keys to the app's own
`i18n/phrases*.properties`: `part.next-jobs-list.displayName`, `.description`, `.title`, `.showCount`, `.text` and
`.pageHeading` (each with `.helpText`), and `part.next-jobs-apply.displayName`, `.description`, `.heading`, `.text`,
`.receipt` and `.surface` (with `.surface.grey`, `.white` and `.plain`).

### From a component of the app's own

```ts
import { renderJobList } from "/lib/next-jobs/views/job-list";
import { renderJobApply } from "/lib/next-jobs/views/job-apply";

const list = renderJobList({
  req,
  locale: "no",
  id: "stillinger",
  title: "Ledige stillinger",
  applyOnSite: true,
  rootClass: "my-job-list",
  buttonClass: "my-button",
});

const form = renderJobApply({ req, locale: "no", rootClass: "my-job-form", buttonClass: "my-button" });
```

`rootClass` and `buttonClass` are classes of the app's own. For something behind the heading of the list, such as an
image or an animation, the app's view imports the macro in `lib/next-jobs/views/job-list-macro.ftlh`, puts its markup
between the tags, and is drawn with the model from `getJobListModel()`. The markup lands in a box as large as the
surface behind the heading (`.next-jobs-list--own-graphic`), which takes `--next-jobs--graphic-opacity` and is hidden
when a site chooses another graphic in the admin tool.

A component of the app's own doesn't bring the stylesheet and the script along, as the parts do. Either add
`getPageContributions()` from `/lib/next-jobs/views/assets` to the response of the page, or build the two into the
app's own bundles from the types package:

```css
@import url("@item-enonic-types/lib-next-jobs/dist/styles/next-jobs.css");
```

```ts
import NextJobsForm from "@item-enonic-types/lib-next-jobs/dist/assets/next-jobs/form";

if (!window.customElements.get("next-jobs-form")) {
  window.customElements.define("next-jobs-form", NextJobsForm);
}
```

`next-jobs.css` is `button.css`, `job-list.css` and `job-apply.css` in the same folder: leave out `button.css` when
the app hands in a button class of its own.

## The look

Without anything set, the views take the font and the text color of the page and use a dark blue-grey surface, blue
links and buttons and corners of 12 px. A site changes the look in «Utseende» in the admin tool, or in its own
stylesheet by giving these custom properties values on the element marked `data-next-jobs-design` (the tool's values
go before the stylesheet's):

| Property | Sets |
| --- | --- |
| `--next-jobs--brand` | The surface behind the heading and on the cards. The text on it is white |
| `--next-jobs--accent`, `--next-jobs--focus` | Links and small details, and the focus mark |
| `--next-jobs--ink`, `--next-jobs--muted` | The text, and the muted text |
| `--next-jobs--button`, `--next-jobs--button-text` | The background of the buttons, and the text on them |
| `--next-jobs--background` | The surface behind the list, the posting and the form. Without it, the page's own shows through |
| `--next-jobs--card-radius`, `--next-jobs--control-radius` | The corners of cards and panels, and of the fields |
| `--next-jobs--margin` | The space above and below the list and the form, inside the background. Never more than a tenth of the window |
| `--next-jobs--graphic-opacity` | How much of the graphic behind the heading shows, from 0 to 1: the app's own decoration, a pattern or an image |
| `--next-jobs--font-title`, `--next-jobs--font-text` | The fonts of the titles and of the text |
| `--next-jobs--space`, `--next-jobs--space-wide` | The space between the parts of a posting and of the form |
| `--next-jobs--side`, `--next-jobs--max-width` | For a list that goes out to the edges of the page: the space at the sides, and the widest the surface, the text and the cards get (1200 px without it) |
| `--next-jobs--scroll-offset` | The height of a menu that stays at the top, so the receipt after an application isn't hidden behind it |

The graphic behind the heading is chosen in the tool: the app's own decoration, nothing, one of four patterns the
stylesheet draws (dots, slanted lines, a grid, rings), or an image from the site's content project. The choice is the
attribute `data-next-jobs-graphic` on the same element. An image is stored as the id of its content, among the 200
images changed last, and must be published for visitors to see it: until then they get the app's own decoration.
Only content of the type `media:image` can be chosen, not a drawing (`media:vector`). A veil in the primary color
lies over a pattern or an image where the text is.

When the form is the element right after the list, the two share the margin between them.

## Languages

Every text is in Norwegian (`i18n/next-jobs.properties`) and English (`next-jobs_en.properties`). The views take the
language of the page, and the dates follow it. The texts from Next (titles, descriptions, lists) are in the language
the position was written in.

## Several sites

One XP instance can have several sites with the app, each its own tenant in Next. The settings, the key, the lists in
memory and the calls all belong to a site, and nothing about Next is shared between them.

## Personal data

Applications, CVs and the candidate's address pass through the services on their way to Next. Nothing of them is
stored or logged in XP: only the status and the id of the position.

## Developing

```bash
npm install
./gradlew generateTypeScript     # The types of the part descriptors, needed before the checks
npm run check                    # ESLint, Stylelint and the type checks
./gradlew build                  # The jar, in build/libs/
./gradlew publishToMavenLocal    # To ~/.m2, for an app on the same machine (add mavenLocal() to its repositories)
npm run prepublishOnly           # The types package, in dist/
npm pack                         # The types package as a file, for an app on the same machine
```

Gradle needs Java 11 or newer. With the Enonic CLI installed, the JDK of an XP distribution works:
`JAVA_HOME=~/.enonic/distributions/<distribution>/jdk`.

An app on the same machine can use a change before it is released, with `mavenLocal()` first in its repositories
and the packed file as the types package: `npm i -D ../lib-xp-next-jobs/item-enonic-types-lib-next-jobs-<version>.tgz`.
Pack and install again after a change to the types, the stylesheets or the script of the form.

The stylesheets are built for the browsers in `browserslist` in `package.json`. An app that imports them into its
own bundle builds them for its own.

Not here yet: tests, and Storybook (the stories of the views are in `lib/next-jobs/views/*.stories.ts`, but nothing
here runs them).

## Releasing

A change that an app, an editor or a visitor will notice has a changeset (`npx changeset`). On `main`, the Publish
workflow keeps a pull request named «Version Packages» open with the changesets it has found. Merging that pull
request is the release: the workflow publishes the types package to npm (`@item-enonic-types/lib-next-jobs`), tags
the version, makes the release on GitHub, and publishes the jar to `repo.itemtest.no/releases`
(`no.item:lib-xp-next-jobs`). A version that is out is never overwritten.

If the jar didn't go out for the version on `main`, run the Publish workflow by hand (_Actions → Publish → Run
workflow_): that publishes the jar only.

The workflow needs two things from outside the repository: the organization's secrets `REPOSILITE_USERNAME` and
`REPOSILITE_PASSWORD`, and a trusted publisher for the package on npmjs.com that names this repository and
`publish.yml`.
