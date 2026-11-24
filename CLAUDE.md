# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this repository.

## What this is

A library for **Enonic XP 7** apps (`no.item:lib-xp-next-jobs`) that shows job openings from **Next**, Item's
recruitment system: the list of positions, the posting, the application form and an admin tool. The README says how
an app uses it. Server code is TypeScript compiled with tsup and run by XP's JavaScript engine (Nashorn: no `Intl`,
no browser APIs on the server). Views are FreeMarker.

It was taken out of `ItemConsulting/xp-item-web`, whose branches still have a copy under the same paths until the
one that moves the app over to the library is merged. Until then, make a change in both places.

## Versions

- XP is **7.15.4** (`xpVersion` in `gradle.properties`). Use XP 7 APIs and docs only. `@enonic-types/*` must match.
- Item's newer libraries and starter target XP 8, with tsdown, Biome and version catalogs. None of that applies here:
  this repo uses plain coordinates in `build.gradle`, tsup, ESLint + Prettier and Stylelint.

## Commands

```bash
./gradlew generateTypeScript     # The types of the part descriptors (.xp-codegen/), needed before the checks
npm run check                    # ESLint + Stylelint + type check (server and assets)
./gradlew build                  # The jar, in build/libs/
./gradlew publishToMavenLocal    # To ~/.m2, to try the library in an app on the same machine
npm run prepublishOnly           # The types package, in dist/: types, the views' stylesheets, the form's script
npm pack                         # The types package as a file, to try it in an app on the same machine
```

Run `npm run check` before you say a change is done. Prettier requires LF line endings.

## Code layout

```
src/main/resources/
  lib/next-jobs/             client.ts and apply.ts call Next. settings.ts stores what a site has set. site.ts
                             finds the site of a request. design.ts is the look a site can set. types.ts mirrors
                             Next's contract
  lib/next-jobs/views/       The list, the posting and the form: model (.ts), view (.ftlh), stylesheet (.css) and
                             story (.stories.ts, which nothing here runs yet). next-jobs.css is all the stylesheets
  lib/next-jobs/admin/       The admin tool: tool.ts and tool.ftlh, and who gets in (access.ts)
  site/parts/next-jobs-*/    The two parts: a descriptor and a thin controller around the views
  services/next-apply/       Forwards an application to Next
  services/next-cv/          Sends a CV to Next to be read
  assets/next-jobs/          The script of the form (form.ts, <next-jobs-form>), the bundle entries, the tool's images
  i18n/next-jobs*.properties Every text, Norwegian and English
.xp-codegen/                 Types generated from the XML descriptors — never edit by hand
```

## Rules

- **Nothing of an app's own.** No import from outside this repository's own paths and the libraries in `build.gradle`,
  no name of a site or a customer, no class or CSS variable of a site. What is the app's own is handed in:
  `ToolOptions` for the tool, the options of `renderJobList()` and `renderJobApply()` for the views. Imports between
  the files of `lib/next-jobs/` are relative.
- **Next is the source.** XP stores no positions and no applications. The types in `types.ts` mirror
  `@item/contract/site` in the Next repo: when the API changes, change Next first and then the types here. Don't
  invent fields.
- **Never store or log applications, CVs, the candidate's address or other personal data.** Log only the status and
  the id of the position. The CV reading goes through `services/next-cv/` to Next, never straight to an AI provider.
- **The key goes one way.** It is in the app's .cfg file, or pasted into the tool, which stores it beside the settings.
  Never put it in a model, a view, a redirect or a log, and read it only through `getConfig()` in `client.ts`. Read
  the address through `getBaseUrl()`/`getConfig()`, never straight from `app.config`.
- **Who may do what** is in `admin/access.ts`. Only `system.admin` sets the address and the key
  (`canSetConnection()`), since whoever sets the address decides where the key is sent: a new setting that changes
  where calls go, or what they carry, is checked the same way, and its field is left out of the form for the others.
  Keep the settings repository closed to everyone but `system.admin`: XP's defaults let every user read it, and the
  tool reads and writes it for its users.
- **Everything is for a site.** One XP instance can have several sites with the app, each its own tenant in Next. The
  settings, the key, the lists in memory and the calls all take a site key (`<project>:<site id>`): get it with
  `getCurrentSiteKey()` on a page or in a service, and pass it on. The variables of a file are shared by every
  request, so never keep something about one site, or one request, in one of them.
- **Calls to Next** are made on the server only, with short timeouts and no retries inside a visitor's request. Good
  answers are cached, and the last good answer is used when Next fails. Return a status the view can use, so editors
  (not visitors) see why something is empty or old.
- **Escape all outside text.** `.ftlh` escapes by default; never use `?no_esc` on data from Next or from an editor's
  plain-text field. The formatted description is drawn by the view from its structure.
- **The look goes through `--next-jobs--*`** (`design.ts`). The stylesheets in `views/` read them with plain values as
  the fallbacks (`DEFAULT_DESIGN`): a color or measure that should follow the site is one of these properties, not a
  new literal. Only `#rrggbb`, whole numbers, font names without quotes and the known effects are written into a
  style attribute. `getDesignVariables()` and the script in `tool.ftlh` build the same list; change both.
- **Names start with `next-jobs`**: classes, custom properties, the custom element, assets, log lines.
- **Two languages.** Add a text to `next-jobs.properties` (Norwegian) and to `next-jobs_en.properties`, where a
  straight apostrophe is written `’` (Java's MessageFormat reads `'` as a quote). The views take the language of the
  page; the tool takes the browser's and keeps it in the context while the request is answered. Dates and decimals
  follow the same language (`dates.ts`).
- **Accessibility is required**: semantic HTML, labelled regions, keyboard support, `prefers-reduced-motion`.
- Code, comments and identifiers in English. Comments explain *why*, in full sentences.

## Working on a task

- Start from a new branch off `main`.
- For anything bigger than a small fix, present a short plan before writing code.
- Add a changeset for changes an app, an editor or a visitor will notice.
