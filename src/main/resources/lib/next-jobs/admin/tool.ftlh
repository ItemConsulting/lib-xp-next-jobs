[#-- @ftlvariable name="lang" type="String" --]
[#-- @ftlvariable name="title" type="String" --]
[#-- @ftlvariable name="intro" type="String" --]
[#-- @ftlvariable name="action" type="String" --]
[#-- @ftlvariable name="notice" type="Object" --]
[#-- @ftlvariable name="settingsHeading" type="String" --]
[#-- @ftlvariable name="baseUrl" type="Object" --]
[#-- @ftlvariable name="apiKey" type="Object" --]
[#-- @ftlvariable name="maxPositions" type="Object" --]
[#-- @ftlvariable name="save" type="String" --]
[#-- @ftlvariable name="displayHeading" type="String" --]
[#-- @ftlvariable name="displayHelp" type="String" --]
[#-- @ftlvariable name="display" type="java.util.ArrayList" --]
[#-- @ftlvariable name="positionsHeading" type="String" --]
[#-- @ftlvariable name="positionsHelp" type="String" --]
[#-- @ftlvariable name="positions" type="java.util.ArrayList" --]
[#-- @ftlvariable name="positionsEmpty" type="String" --]
[#-- @ftlvariable name="statusHeading" type="String" --]
[#-- @ftlvariable name="status" type="java.util.ArrayList" --]
[#-- @ftlvariable name="refresh" type="String" --]
[#-- @ftlvariable name="careerPage" type="Object" --]
[#-- @ftlvariable name="order" type="Object" --]
[#-- @ftlvariable name="checkForms" type="String" --]
[#-- @ftlvariable name="formChecks" type="Object" --]
[#-- @ftlvariable name="logo" type="Object" --]
[#-- @ftlvariable name="faviconUrl" type="String" --]
[#-- @ftlvariable name="preview" type="Object" --]
[#-- @ftlvariable name="siteKey" type="String" --]
[#-- @ftlvariable name="sitePicker" type="Object" --]
[#-- @ftlvariable name="empty" type="String" --]
[#-- @ftlvariable name="navLabel" type="String" --]
[#-- @ftlvariable name="design" type="Object" --]
[#-- @ftlvariable name="texts" type="Object" --]
[#-- @ftlvariable name="section" type="String" --]

[#-- The label, the error and the help text of a setting, tied to its control for screen readers --]
[#macro setting name field]
  <div class="tool--field">
    <label class="tool--label" for="tool-${name}">${field.label}</label>
    [#nested]
    [#if field.error?has_content]
      <p class="tool--error" id="tool-${name}-error">${field.error}</p>
    [/#if]
    <p class="tool--help" id="tool-${name}-help">${field.help}</p>
  </div>
[/#macro]

[#--
  A point in the menu on the left: a link to a card, with an icon that is all that shows when the menu is folded.
  The icon is drawn by what is nested. The title is the tooltip of the folded menu
--]
[#macro navItem id label]
  <li>
    <a class="tool--nav-link" href="#${id}" title="${label}">
      <svg
        class="tool--nav-icon"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false">[#nested]</svg>
      <span class="tool--nav-text">${label}</span>
    </a>
  </li>
[/#macro]

[#-- Every form says which site it is for, so a change is never made for another one --]
[#macro siteField]<input type="hidden" name="site" value="${siteKey}">[/#macro]

[#-- What every control of a setting has. data-saved is what is in use now: the script compares with it --]
[#macro control name field saved=field.saved]id="tool-${name}" name="${name}" data-saved="${saved}" aria-describedby="tool-${name}-help[#if field.error?has_content] tool-${name}-error[/#if]"[#if field.error?has_content] aria-invalid="true"[/#if][/#macro]

[#-- A row of the look with a slider: a measure that is the site's own when the box is checked --]
[#macro designRange range]
  [#local rangeId = "tool-design-${range.key}"]
  <li class="tool--design-row tool--design-row-wide" data-design-row="${range.key}">
    <label class="tool--label" for="${rangeId}" id="${rangeId}-label">${range.label}</label>
    [#-- Named by both texts, so each check box says which value it is for --]
    <label class="tool--remove tool--design-own">
      <input
        class="tool--check"
        name="own"
        type="checkbox"
        value="${range.key}"
        data-saved="${range.own?c}"
        aria-labelledby="${rangeId}-own ${rangeId}-label"
        data-design-own
        [#if range.own]checked[/#if]>
      <span id="${rangeId}-own">${design.ownValue}</span>
    </label>
    <span class="tool--design-range">
      <input
        id="${rangeId}"
        name="${range.key}"
        type="range"
        min="0"
        max="${range.max}"
        step="${range.step}"
        value="${range.value}"
        data-saved="${range.value}"
        aria-describedby="${rangeId}-help"
        data-design-value>
      <output for="${rangeId}" data-design-range-text data-text="${range.valueText}">${range.text}</output>
    </span>
    <span class="tool--check-details tool--design-help" id="${rangeId}-help">${range.help}</span>
  </li>
[/#macro]

[#-- A row of the look with a list to choose from --]
[#macro designChoice choice]
  [#local choiceId = "tool-design-${choice.key}"]
  <li class="tool--design-row tool--design-row-wide" data-design-row="${choice.key}">
    <label class="tool--label" for="${choiceId}">${choice.label}</label>
    <select
      class="tool--input tool--select tool--select-wide tool--design-select"
      id="${choiceId}"
      name="${choice.key}"
      data-saved="${choice.value}"
      aria-describedby="${choiceId}-help"
      data-design-value>
      [#list choice.options as option]
        <option value="${option.value}"[#if option.selected] selected[/#if]>${option.label}</option>
      [/#list]
    </select>
    <span class="tool--check-details tool--design-help" id="${choiceId}-help">${choice.help}</span>
  </li>
[/#macro]

<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  [#-- The icon on the browser tab. The one in the XP menu is white, and would not show on a light tab --]
  <link rel="icon" type="image/svg+xml" href="${faviconUrl}">
  [#-- The tool is one page with no site around it, so the styles are here and not in the site's stylesheet --]
  <style>
    :root {
      --tool--teal: #0b3c49;
      --tool--ink: #1b1b33;
      --tool--muted: #4b5260;
      --tool--accent: #4f46e5;
      --tool--error: #b42318;
      --tool--ok: #1a6b3c;
      --tool--toast: #0f5132;
      --tool--border: rgb(27 27 51 / 22%);
      --tool--logo-grey: #ced8db;
      --tool--slide: 0.4s cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background-color: #f4f5f7;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      color: var(--tool--ink);
    }

    .tool--header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      padding: 20px 24px;
      background-color: var(--tool--teal);

      /* The grey of the wordmark beside it */
      color: var(--tool--logo-grey);
      gap: 16px 24px;
    }

    /* The wordmark of Next, 36px high as in Next's own menu. Never stretched */

    .tool--logo {
      display: block;
      flex: none;
      width: auto;
      height: 36px;
    }

    .tool--header-text {
      flex: 1 1 240px;
      padding-left: 24px;
      border-left: 1px solid rgb(206 216 219 / 35%);
    }

    .tool--title {
      margin-block: 0 2px;
      font-size: 24px;
    }

    .tool--intro {
      margin: 0;
    }

    /*
     * The menu on the left and the card it has chosen in the middle. With the preview open they slide to the left,
     * the menu folds to its icons, and the preview takes the rest
     */

    .tool--layout {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 24px;

      /* The closed preview waits a little outside the right edge, and must not make the page scroll sideways */
      overflow-x: clip;
    }

    .tool--nav {
      position: sticky;
      top: 24px;
      flex: none;
      width: 256px;
      margin-right: 24px;
      padding: 8px;
      overflow: hidden;
      border: 1px solid var(--tool--border);
      border-radius: 14px;
      background-color: #fff;
      transition: width var(--tool--slide);
    }

    .tool--nav-list {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      list-style: none;
      gap: 2px;
    }

    .tool--nav-link {
      display: flex;
      align-items: center;
      min-height: 44px;
      padding: 0 11px;
      border-radius: 9px;
      font-weight: 600;
      color: var(--tool--ink);
      text-decoration: none;
      white-space: nowrap;
      gap: 12px;
    }

    .tool--nav-link:hover {
      background-color: rgb(79 70 229 / 8%);
    }

    /* The card that is shown. The bar at the edge says so without the color */

    .tool--nav-link[aria-current] {
      background-color: rgb(79 70 229 / 12%);
      box-shadow: inset 3px 0 0 var(--tool--accent);
      color: var(--tool--accent);
    }

    /* Inside the edge: the menu cuts off what is outside it */

    .tool--nav-link:focus-visible {
      outline: 2px solid var(--tool--accent);
      outline-offset: -2px;
    }

    .tool--nav-icon {
      flex: none;
    }

    .tool--nav-text {
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity var(--tool--slide);
    }

    /* Folded: as wide as an icon and its padding. The texts are still there for screen readers, and as tooltips */

    .tool--previewing .tool--nav {
      width: 60px;
    }

    .tool--previewing .tool--nav-text {
      opacity: 0;
    }

    .tool--main {
      display: flex;
      flex: 0 1 auto;
      flex-direction: column;
      width: 760px;
      min-width: 0;
      transition: width var(--tool--slide);
      gap: 20px;
    }

    .tool--previewing .tool--main {
      width: 440px;
    }

    /* A card the menu hasn't chosen. The cards are flex boxes, which would show them anyway */

    .tool--card[hidden] {
      display: none;
    }

    /* The header stays out of the way when the menu jumps to a card, as it does without the script */

    .tool--card[data-section] {
      scroll-margin-top: 24px;
    }

    /* Closed, the preview has no width and is out of the tab order. Open, it grows from the right */

    .tool--preview {
      position: sticky;
      top: 24px;
      display: flex;
      flex: 0 1 0;
      flex-direction: column;
      min-width: 0;
      height: calc(100vh - 48px);
      overflow: hidden;
      border: 1px solid var(--tool--border);
      border-radius: 14px;
      background-color: #fff;
      opacity: 0;
      visibility: hidden;
      translate: 48px 0;
      transition:
        flex-grow var(--tool--slide),
        margin-left var(--tool--slide),
        opacity var(--tool--slide),
        translate var(--tool--slide),
        height var(--tool--slide),
        visibility 0s linear 0.4s;
    }

    .tool--previewing .tool--preview {
      flex-grow: 1;
      margin-left: 24px;
      opacity: 1;
      visibility: visible;
      translate: 0 0;
      transition-delay: 0s;
    }

    .tool--preview-bar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      padding: 12px 16px;
      border-bottom: 1px solid var(--tool--border);
      gap: 8px 16px;
    }

    .tool--preview-bar > * {
      margin: 0;
    }

    /* The heading with the line under it that says which version of the page is shown */

    .tool--preview-title {
      display: flex;
      flex-direction: column;
    }

    .tool--preview-title > * {
      margin: 0;
    }

    .tool--preview-heading {
      font-size: 16px;
    }

    .tool--preview-note {
      font-size: 13px;
      color: var(--tool--muted);
    }

    /* The size of the page in the frame: the slider takes the room between the heading and the buttons */

    .tool--zoom {
      display: flex;
      align-items: center;
      flex: 1 1 200px;
      min-width: 0;
      gap: 12px;
    }

    .tool--zoom-range {
      flex: 1 1 80px;
      min-width: 60px;
      max-width: 240px;
      height: 36px;
      margin: 0;
      accent-color: var(--tool--accent);
      cursor: pointer;
    }

    .tool--zoom-range:focus-visible {
      border-radius: 6px;
      outline: 2px solid var(--tool--accent);
      outline-offset: 2px;
    }

    /* Figures of the same width, so the text doesn't push the buttons around while the slider moves */

    .tool--zoom-value {
      flex: none;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      color: var(--tool--muted);
      white-space: nowrap;
    }

    .tool--preview-frame {
      position: relative;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /*
     * The page scaled down: the frame is made 1/zoom as large as its box and scaled down to fit it. The slider
     * sets --tool--zoom. 0.7 until then, which gives the page an ordinary desktop width in the panel
     */

    .tool--preview-frame iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: calc(100% / var(--tool--zoom, 0.7));
      height: calc(100% / var(--tool--zoom, 0.7));
      border: 0;
      transform: scale(var(--tool--zoom, 0.7));
      transform-origin: 0 0;
    }

    .tool--card {
      display: flex;
      flex-direction: column;
      padding: 24px;
      border: 1px solid var(--tool--border);
      border-radius: 14px;
      background-color: #fff;
      gap: 18px;
    }

    .tool--card > *,
    .tool--field > * {
      margin: 0;
    }

    .tool--heading {
      font-size: 19px;
    }

    .tool--field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* The key is sent to the address, so the two stand side by side where there is room for both */

    .tool--pair {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
      align-items: start;
      gap: 18px 24px;
    }

    .tool--label {
      font-weight: 600;
    }

    /*
     * The dots that stand for a key in use look like content, not like a hint. They fade when the field has focus,
     * since what is typed then takes their place
     */

    .tool--input[type="password"]::placeholder {
      font-size: 11px;
      color: var(--tool--ink);
      letter-spacing: 2px;
      opacity: 1;
    }

    .tool--input[type="password"]:focus::placeholder {
      opacity: 0.35;
    }

    .tool--remove {
      display: flex;
      align-items: flex-start;
      font-size: 14px;
      gap: 8px;
    }

    .tool--input {
      width: 100%;
      max-width: 460px;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--tool--border);
      border-radius: 9px;
      font: inherit;
      color: inherit;
    }

    /* Shown, but not this user's to change */

    .tool--input[readonly] {
      border-style: dashed;
      background-color: transparent;
    }

    /* The browser's own arrow sits against the edge and can't be moved, so the select draws its own */

    .tool--select {
      max-width: 160px;
      padding-right: 44px;
      background-color: #fff;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%234b5260' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-size: 12px 8px;
      appearance: none;
    }

    .tool--select-wide {
      max-width: 460px;
    }

    /* A text of several lines gets the width of the card, and can be made taller */

    .tool--textarea {
      display: block;
      max-width: none;
      min-height: 96px;
      resize: vertical;
    }

    .tool--input[aria-invalid="true"] {
      border-color: var(--tool--error);
    }

    .tool--help {
      font-size: 14px;
      color: var(--tool--muted);
    }

    .tool--error {
      font-size: 14px;
      font-weight: 600;
      color: var(--tool--error);
    }

    .tool--button {
      align-self: flex-start;
      min-height: 44px;
      padding: 8px 20px;
      border: 1px solid var(--tool--accent);
      border-radius: 9px;
      background-color: var(--tool--accent);
      font: inherit;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
    }

    .tool--button-quiet {
      background-color: #fff;
      color: var(--tool--accent);
    }

    .tool--button-small {
      min-height: 36px;
      padding: 4px 14px;
      font-size: 14px;
      text-decoration: none;
    }

    /* The X that closes the preview: as high as the buttons beside it, and square */

    .tool--button-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      padding: 0;
    }

    .tool--button-icon svg {
      width: 14px;
      height: 14px;
    }

    /* On the dark header: a white button */

    .tool--button-header {
      align-self: center;
      border-color: #fff;
      background-color: #fff;
      color: var(--tool--teal);
    }

    .tool--button-header:focus-visible {
      outline-color: #fff;
    }

    a.tool--button {
      display: inline-flex;
      align-items: center;
    }

    .tool--button:hover {
      filter: brightness(0.92);
    }

    /* Nothing to save: grey, and not a pointer */

    .tool--button:disabled {
      border-color: #c9ccd3;
      background-color: #c9ccd3;
      color: var(--tool--muted);
      cursor: default;
      filter: none;
    }

    .tool--input:focus-visible,
    .tool--button:focus-visible {
      outline: 2px solid var(--tool--accent);
      outline-offset: 2px;
    }

    /* The choice of site is one line: the name, the list and the button */

    .tool--site {
      flex-flow: row wrap;
      align-items: center;
      gap: 12px;
    }

    .tool--site .tool--select {
      flex: 1 1 240px;
    }

    .tool--site .tool--button {
      align-self: center;
    }

    /*
     * The receipt for a change: a layer at the bottom of the screen that is there for three seconds and then goes
     * away. Done with an animation, so it also goes away without the script. It waits while the pointer is on it
     */

    .tool--toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      z-index: 10;
      display: flex;
      align-items: center;
      max-width: calc(100vw - 32px);
      margin: 0;
      padding: 12px 18px;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgb(27 27 51 / 22%);
      background-color: var(--tool--toast);
      font-weight: 600;
      color: #fff;
      translate: -50% 0;
      animation: tool--toast 3.5s ease-out forwards;
      gap: 10px;
    }

    .tool--toast svg {
      flex: none;
    }

    .tool--toast:hover {
      animation-play-state: paused;
    }

    /* In at the start and out at the end; in between, three seconds of standing still */

    @keyframes tool--toast {
      0% {
        opacity: 0;
        translate: -50% 12px;
      }

      6% {
        opacity: 1;
        translate: -50% 0;
      }

      92% {
        opacity: 1;
        translate: -50% 0;
      }

      100% {
        opacity: 0;
        visibility: hidden;
        translate: -50% 12px;
      }
    }

    /* Without the movement: there, and then gone */

    @keyframes tool--toast-still {
      0%,
      92% {
        opacity: 1;
      }

      100% {
        opacity: 0;
        visibility: hidden;
      }
    }

    .tool--notice {
      margin: 0;
      padding: 12px 16px;
      border: 1px solid var(--tool--ok);
      border-radius: 9px;
      background-color: #fff;
      font-weight: 600;
      color: var(--tool--ok);
    }

    .tool--notice-error {
      border-color: var(--tool--error);
      color: var(--tool--error);
    }

    .tool--checks {
      display: flex;
      flex-direction: column;
      padding: 0;
      list-style: none;
    }

    .tool--check-row {
      display: grid;
      grid-template-columns: 24px 1fr;
      align-items: start;
      padding-block: 12px;
      border-top: 1px solid var(--tool--border);
      gap: 2px 12px;
    }

    .tool--check-row:last-child {
      border-bottom: 1px solid var(--tool--border);
    }

    .tool--check {
      width: 20px;
      height: 20px;
      margin: 2px 0 0;
      accent-color: var(--tool--accent);
    }

    .tool--check-details {
      grid-column: 2;
      font-size: 14px;
      color: var(--tool--muted);
    }

    .tool--check-note {
      font-weight: 600;
    }

    /* The look: a row for each value, with the color first, then its name and the check box that makes it the site's own */

    .tool--design {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .tool--design-row {
      display: grid;
      grid-template-columns: 52px 1fr auto;
      align-items: center;
      padding-block: 12px;
      border-top: 1px solid var(--tool--border);
      gap: 4px 14px;
    }

    .tool--design-row:last-child {
      border-bottom: 1px solid var(--tool--border);
    }

    /* The row of the image, while the graphic is something else */

    .tool--design-row[hidden] {
      display: none;
    }

    .tool--color {
      align-self: start;
      grid-row: 1 / span 2;
      width: 52px;
      height: 40px;
      padding: 3px;
      border: 1px solid var(--tool--border);
      border-radius: 9px;
      background-color: #fff;
      cursor: pointer;
    }

    .tool--color:focus-visible {
      outline: 2px solid var(--tool--accent);
      outline-offset: 2px;
    }

    .tool--design-own {
      align-items: center;
    }

    .tool--design-own .tool--check {
      margin: 0;
    }

    .tool--design-help,
    .tool--design-warning {
      grid-column: 2 / -1;
      margin: 0;
    }

    /* Always there, so a screen reader hears the warning when the script writes it. Empty, it takes no room */

    .tool--design-warning:empty {
      display: none;
    }

    /* A measure has no color in front: the slider is under the name, as wide as the row */

    .tool--design-row-wide {
      grid-template-columns: 1fr auto;
    }

    .tool--design-row-wide .tool--design-help {
      grid-column: 1 / -1;
    }

    .tool--design-select {
      grid-column: 1 / -1;
    }

    .tool--design-range {
      display: flex;
      align-items: center;
      grid-column: 1 / -1;
      gap: 14px;
    }

    .tool--design-range input {
      width: min(320px, 100%);
      height: 36px;
      margin: 0;
      accent-color: var(--tool--accent);
      cursor: pointer;
    }

    .tool--design-range output {
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      color: var(--tool--muted);
    }

    /* With the script on, a row also has a handle to drag by in front and two buttons to move it at the end */

    .tool--sorting .tool--check-row {
      grid-template-columns: 14px 24px 1fr auto;
    }

    .tool--sorting .tool--check-details {
      grid-column: 3;
    }

    .tool--drag {
      align-self: center;
      grid-row: 1 / span 2;
      color: var(--tool--muted);
      cursor: grab;
      touch-action: none;
    }

    .tool--drag svg {
      display: block;
      width: 10px;
      height: 16px;
    }

    .tool--moves {
      display: flex;
      align-self: center;
      grid-column: 4;
      grid-row: 1 / span 2;
      gap: 4px;
    }

    .tool--move {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid var(--tool--border);
      border-radius: 8px;
      background-color: #fff;
      color: var(--tool--accent);
      cursor: pointer;
    }

    .tool--move svg {
      width: 12px;
      height: 8px;
    }

    .tool--move:hover {
      border-color: var(--tool--accent);
    }

    .tool--move:disabled {
      border-color: var(--tool--border);
      color: #b4b8c0;
      cursor: default;
    }

    /* The row that is being dragged: a place holder where it will land */

    .tool--dragging {
      background-color: rgb(79 70 229 / 8%);
      opacity: 0.6;
    }

    .tool--actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .tool--subheading {
      margin-top: 8px;
      font-size: 16px;
    }

    .tool--subheading:focus {
      outline: none;
    }

    .tool--visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .tool--check:focus-visible,
    .tool--move:focus-visible {
      outline: 2px solid var(--tool--accent);
      outline-offset: 2px;
    }

    .tool--status {
      display: grid;
      grid-template-columns: minmax(120px, max-content) 1fr;
      gap: 10px 24px;
    }

    .tool--status dt {
      color: var(--tool--muted);
    }

    .tool--status dd {
      margin: 0;
      overflow-wrap: anywhere;
    }

    .tool--tone-ok {
      font-weight: 600;
      color: var(--tool--ok);
    }

    .tool--tone-problem {
      font-weight: 600;
      color: var(--tool--error);
    }

    /* Too narrow for two columns: the preview opens above the cards instead */

    @media (width <= 900px) {
      .tool--layout {
        align-items: stretch;
        flex-direction: column;
      }

      .tool--main,
      .tool--previewing .tool--main {
        width: 100%;
      }

      /* The menu is a row above the cards, with its texts also when the preview is open */

      .tool--nav,
      .tool--previewing .tool--nav {
        position: static;
        width: auto;
        margin: 0 0 20px;
      }

      .tool--nav-list {
        flex-direction: row;
        overflow-x: auto;
      }

      .tool--previewing .tool--nav-text {
        opacity: 1;
      }

      .tool--preview {
        position: static;
        flex: none;
        order: -1;
        height: 0;
        border-width: 0;
        translate: 0 -24px;
      }

      .tool--previewing .tool--preview {
        height: 70vh;
        margin: 0 0 20px;
        border-width: 1px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tool--toast {
        animation-name: tool--toast-still;
      }

      .tool--nav,
      .tool--nav-text,
      .tool--main,
      .tool--preview {
        transition: none;
      }
    }

    /* Opened again after a save: straight to the open state, without the slide */

    .tool--no-motion .tool--nav,
    .tool--no-motion .tool--nav-text,
    .tool--no-motion .tool--main,
    .tool--no-motion .tool--preview {
      transition: none;
    }

    @media (width <= 520px) {
      .tool--status {
        grid-template-columns: 1fr;
        gap: 2px;
      }

      .tool--status dd {
        margin-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <header class="tool--header">
    <img class="tool--logo" src="${logo.url}" alt="${logo.alt}" width="688" height="226">

    <div class="tool--header-text">
      <h1 class="tool--title">${title}</h1>
      <p class="tool--intro">${intro}</p>
    </div>

    [#if preview?has_content]
      [#-- Shown by the script, which is what opens the preview. Open, the X in the preview closes it --]
      <button
        class="tool--button tool--button-header"
        type="button"
        hidden
        aria-expanded="false"
        aria-controls="tool-preview"
        data-preview-open>${preview.open}</button>
    [/#if]
  </header>

  <div class="tool--layout">
    [#if !empty?has_content]
      [#-- data-start is the card to show when the address names none: the one the last action was in --]
      <nav class="tool--nav" aria-label="${navLabel}" data-nav data-start="tool-${section}">
        <ul class="tool--nav-list" role="list">
          [@navItem id="tool-settings" label=settingsHeading]
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>
          [/@navItem]
          [@navItem id="tool-texts" label=texts.heading]
            <path d="M5 6.5h14M12 6.5v12M9.5 18.5h5"/>
          [/@navItem]
          [@navItem id="tool-display" label=displayHeading]
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>
          [/@navItem]
          [@navItem id="tool-design" label=design.heading]
            <path d="M12 3.5c-3 3.7-5.5 6.5-5.5 9.6a5.5 5.5 0 0 0 11 0c0-3.1-2.5-5.9-5.5-9.6Z"/>
          [/@navItem]
          [@navItem id="tool-positions" label=positionsHeading]
            <path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>
          [/@navItem]
          [@navItem id="tool-status" label=statusHeading]
            <path d="M3 12h4l2.5-6 4 12 2.5-6h5"/>
          [/@navItem]
        </ul>
      </nav>
    [/#if]

    <main class="tool--main">
    [#--
      Something that went wrong stays at the top until the next action. That a change is saved is said in a layer at
      the bottom of the screen, which goes away by itself
    --]
    [#if notice?has_content]
      [#if notice.kind == "error"]
        <p class="tool--notice tool--notice-error" role="alert">${notice.text}</p>
      [#else]
        <p class="tool--toast" role="status">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3.2L13 4.8"/></svg>
          <span>${notice.text}</span>
        </p>
      [/#if]
    [/#if]

    [#if sitePicker?has_content]
      [#-- A reading, so it is a GET: the address then names the site, and can be kept as a bookmark --]
      <form class="tool--card tool--site" method="get" action="${action}" data-site-form>
        <label class="tool--label" for="tool-site">${sitePicker.label}</label>
        <select class="tool--input tool--select tool--select-wide" id="tool-site" name="site">
          [#list sitePicker.options as option]
            <option value="${option.value}"[#if option.selected] selected[/#if]>${option.label}</option>
          [/#list]
        </select>
        <button class="tool--button tool--button-quiet" type="submit">${sitePicker.submit}</button>
      </form>
    [/#if]

    [#if empty?has_content]
      <p class="tool--card">${empty}</p>
    [#else]
    <form
      class="tool--card"
      id="tool-settings"
      method="post"
      action="${action}"
      aria-labelledby="tool-settings-heading"
      novalidate
      data-section
      data-save-form>
      <h2 class="tool--heading" id="tool-settings-heading">${settingsHeading}</h2>
      [@siteField /]

      [#if connectionLocked?has_content]
        [#-- Only an administrator sets where the key is sent. Others see the address in use, and no field for the key --]
        <div class="tool--field">
          <label class="tool--label" for="tool-baseUrl">${baseUrl.label}</label>
          <input
            class="tool--input"
            id="tool-baseUrl"
            type="url"
            value="${baseUrl.saved}"
            readonly
            aria-describedby="tool-baseUrl-help">
          <p class="tool--help" id="tool-baseUrl-help">${connectionLocked}</p>
        </div>
      [#else]
      <div class="tool--pair">
        [@setting name="baseUrl" field=baseUrl]
          <input
            class="tool--input"
            type="url"
            inputmode="url"
            value="${baseUrl.value}"
            autocomplete="off"
            spellcheck="false"
            [@control name="baseUrl" field=baseUrl /]>
        [/@setting]

        [#--
          The key is never written into the page, so the field has no value, and anything typed is a change
          (data-saved is empty). When a key is in use, the placeholder shows dots where it would stand: always the
          same number, so they say nothing about the key. «new-password» keeps the browser from filling in the
          password of the admin login.
        --]
        [@setting name="apiKey" field=apiKey]
          <input
            class="tool--input"
            type="password"
            autocomplete="new-password"
            autocapitalize="off"
            spellcheck="false"
            [#if apiKey.masked]placeholder="●●●●●●●●●●●●●●●●●●●●"[/#if]
            [@control name="apiKey" field=apiKey saved="" /]>
          [#if apiKey.remove?has_content]
            <label class="tool--remove">
              <input class="tool--check" type="checkbox" name="removeApiKey" value="true" data-saved="false">
              <span>${apiKey.remove}</span>
            </label>
          [/#if]
        [/@setting]
      </div>
      [/#if]

      [@setting name="maxPositions" field=maxPositions]
        <select class="tool--input tool--select" [@control name="maxPositions" field=maxPositions /]>
          [#list maxPositions.options as option]
            <option value="${option.value}"[#if option.selected] selected[/#if]>${option.label}</option>
          [/#list]
        </select>
      [/@setting]

      [@setting name="careerPage" field=careerPage]
        <select class="tool--input tool--select tool--select-wide" [@control name="careerPage" field=careerPage /]>
          [#list careerPage.options as option]
            <option value="${option.value}"[#if option.selected] selected[/#if]>${option.label}</option>
          [/#list]
        </select>
      [/@setting]

      <button class="tool--button" type="submit" aria-describedby="tool-settings-heading">${save}</button>
    </form>

    <form
      class="tool--card"
      id="tool-texts"
      method="post"
      action="${action}"
      aria-labelledby="tool-texts-heading"
      novalidate
      data-section
      data-save-form>
      <h2 class="tool--heading" id="tool-texts-heading">${texts.heading}</h2>
      <p class="tool--help">${texts.help}</p>
      <input type="hidden" name="action" value="texts">
      [@siteField /]

      [@setting name="listTitle" field=texts.title]
        <input
          class="tool--input"
          type="text"
          value="${texts.title.value}"
          maxlength="${texts.titleMax}"
          autocomplete="off"
          [@control name="listTitle" field=texts.title /]>
      [/@setting]

      [@setting name="listText" field=texts.text]
        <textarea
          class="tool--input tool--textarea"
          rows="3"
          maxlength="${texts.textMax}"
          [@control name="listText" field=texts.text /]>${texts.text.value}</textarea>
      [/@setting]

      [@setting name="listCount" field=texts.count]
        <select class="tool--input tool--select tool--select-wide" [@control name="listCount" field=texts.count /]>
          [#list texts.count.options as option]
            <option value="${option.value}"[#if option.selected] selected[/#if]>${option.label}</option>
          [/#list]
        </select>
      [/@setting]

      <button class="tool--button" type="submit" aria-describedby="tool-texts-heading">${save}</button>
    </form>

    <form
      class="tool--card"
      id="tool-display"
      method="post"
      action="${action}"
      aria-labelledby="tool-display-heading"
      data-section
      data-save-form>
      <h2 class="tool--heading" id="tool-display-heading">${displayHeading}</h2>
      <p class="tool--help">${displayHelp}</p>
      <input type="hidden" name="action" value="display">
      [@siteField /]

      <ul class="tool--checks" role="list">
        [#list display as toggle]
          [#assign checkId = "tool-display-${toggle.key}"]
          <li class="tool--check-row">
            <input
              class="tool--check"
              id="${checkId}"
              name="show"
              type="checkbox"
              value="${toggle.key}"
              data-saved="${toggle.on?c}"
              aria-describedby="${checkId}-help"
              [#if toggle.on]checked[/#if]>
            <label class="tool--label" for="${checkId}">${toggle.label}</label>
            <span class="tool--check-details" id="${checkId}-help">${toggle.help}</span>
          </li>
        [/#list]
      </ul>

      <button class="tool--button" type="submit" aria-describedby="tool-display-heading">${save}</button>
    </form>

    <form
      class="tool--card"
      id="tool-design"
      method="post"
      action="${action}"
      aria-labelledby="tool-design-heading"
      data-section
      data-save-form
      data-design-form
      data-min-contrast="${design.minContrast}"
      data-warning="${design.warning}">
      <h2 class="tool--heading" id="tool-design-heading">${design.heading}</h2>
      <p class="tool--help">${design.help}</p>
      <input type="hidden" name="action" value="design">
      [@siteField /]

      <ul class="tool--design" role="list">
        [#list design.colors as color]
          [#assign colorId = "tool-design-${color.key}"]
          <li class="tool--design-row" data-design-row="${color.key}">
            <input
              class="tool--color"
              id="${colorId}"
              name="${color.key}"
              type="color"
              value="${color.value}"
              data-saved="${color.value}"
              data-contrast="${color.contrast}"
              aria-describedby="${colorId}-help ${colorId}-warning"
              data-design-value>
            <label class="tool--label" for="${colorId}" id="${colorId}-label">${color.label}</label>
            [#-- Named by both texts, so each check box says which color it is for --]
            <label class="tool--remove tool--design-own">
              <input
                class="tool--check"
                name="own"
                type="checkbox"
                value="${color.key}"
                data-saved="${color.own?c}"
                aria-labelledby="${colorId}-own ${colorId}-label"
                data-design-own
                [#if color.own]checked[/#if]>
              <span id="${colorId}-own">${design.ownColor}</span>
            </label>
            <span class="tool--check-details tool--design-help" id="${colorId}-help">${color.help}</span>
            <p class="tool--error tool--design-warning" id="${colorId}-warning" role="status" data-design-warning>${color.warning!""}</p>
          </li>
        [/#list]

        [#list design.ranges as range]
          [@designRange range=range /]
        [/#list]

        [#-- The fonts and the effect on the cards. The first choice in each list is the site's own, which stores nothing --]
        [#list design.choices as choice]
          [@designChoice choice=choice /]
        [/#list]

        [#-- What is drawn behind the heading: which graphic, the image when it is one, and how much of it shows --]
        [@designChoice choice=design.graphic /]

        [#-- Only for the graphic that is an image: the script hides the row for the others, and asks for an image for that one --]
        [#assign imageId = "tool-design-${design.graphicImage.key}"]
        <li class="tool--design-row tool--design-row-wide" data-design-row="${design.graphicImage.key}" data-design-image>
          <label class="tool--label" for="${imageId}">${design.graphicImage.label}</label>
          <select
            class="tool--input tool--select tool--select-wide tool--design-select"
            id="${imageId}"
            name="${design.graphicImage.key}"
            data-saved="${design.graphicImage.value}"
            aria-describedby="${imageId}-help ${imageId}-note"
            data-design-value>
            [#list design.graphicImage.options as option]
              <option value="${option.value}"[#if option.url?has_content] data-url="${option.url}"[/#if][#if option.selected] selected[/#if]>${option.label}</option>
            [/#list]
          </select>
          <span class="tool--check-details tool--design-help" id="${imageId}-help">${design.graphicImage.help}</span>
          <p class="tool--error tool--design-warning" id="${imageId}-note">${design.graphicImage.note!""}</p>
        </li>

        [@designRange range=design.graphicOpacity /]
      </ul>

      <button class="tool--button" type="submit" aria-describedby="tool-design-heading">${save}</button>
    </form>

    <form
      class="tool--card"
      id="tool-positions"
      method="post"
      action="${action}"
      aria-labelledby="tool-positions-heading"
      data-section
      data-save-form
      data-saved-order="${order.saved}">
      <h2 class="tool--heading" id="tool-positions-heading">${positionsHeading}</h2>
      <p class="tool--help">${positionsHelp}</p>

      [#if positions?has_content]
        <input type="hidden" name="action" value="positions">
        [@siteField /]

        [#-- The order of the rows is the order of the site: the form sends `listed` as they stand --]
        <ul class="tool--checks" role="list" data-sortable data-max="${order.max}" data-moved="${order.moved}">
          [#list positions as position]
            [#assign checkId = "tool-position-${position?index}"]
            <li class="tool--check-row" data-default-index="${position.defaultIndex?c}" data-title="${position.title}">
              [#-- For the mouse. The two buttons at the end do the same with the keyboard and on touch screens --]
              <span class="tool--drag" title="${order.drag}" aria-hidden="true" hidden data-drag>
                <svg viewBox="0 0 10 16" fill="currentColor" focusable="false">
                  <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                  <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                  <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                </svg>
              </span>
              [#-- Sent for every position in the list, so the ones without a check mark are known --]
              <input type="hidden" name="listed" value="${position.id}">
              <input
                class="tool--check"
                id="${checkId}"
                name="shown"
                type="checkbox"
                value="${position.id}"
                data-saved="${position.shown?c}"
                aria-describedby="${checkId}-details"
                [#if position.shown]checked[/#if]>
              <label class="tool--label" for="${checkId}">${position.title}</label>
              <span class="tool--check-details" id="${checkId}-details">
                ${position.details}
                [#-- Always there: the script shows and hides it as the rows are moved and checked --]
                <span class="tool--check-note" data-over-limit[#if !position.overLimit] hidden[/#if]>[#if position.details?has_content] · [/#if]${position.note}</span>
              </span>
              <span class="tool--moves" hidden data-moves>
                <button class="tool--move" type="button" aria-label="${position.moveUp}" title="${position.moveUp}" data-move="up">
                  <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1 6.5l5-5 5 5"/></svg>
                </button>
                <button class="tool--move" type="button" aria-label="${position.moveDown}" title="${position.moveDown}" data-move="down">
                  <svg viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M1 1.5l5 5 5-5"/></svg>
                </button>
              </span>
            </li>
          [/#list]
        </ul>

        [#-- Where a move is read out to screen readers --]
        <p class="tool--visually-hidden" role="status" aria-live="polite" data-order-live></p>

        <div class="tool--actions">
          <button class="tool--button" type="submit" aria-describedby="tool-positions-heading">${save}</button>
          <button class="tool--button tool--button-quiet" type="button" hidden data-order-reset>${order.reset}</button>
        </div>
      [#else]
        <p>${positionsEmpty}</p>
      [/#if]
    </form>

    <section class="tool--card" id="tool-status" aria-labelledby="tool-status-heading" data-section>
      <h2 class="tool--heading" id="tool-status-heading">${statusHeading}</h2>

      <dl class="tool--status">
        [#list status as row]
          <dt>${row.label}</dt>
          [#-- The mark says the same as the color --]
          <dd class="tool--tone-${row.tone}">[#if row.tone == "ok"]✓ [#elseif row.tone == "problem"]! [/#if]${row.value}</dd>
        [/#list]
      </dl>

      <div class="tool--actions">
        <form method="post" action="${action}">
          <input type="hidden" name="action" value="refresh">
          [@siteField /]
          <button class="tool--button tool--button-quiet" type="submit">${refresh}</button>
        </form>

        [#-- A reading, so a GET: the page comes back with the answer for each position --]
        <form method="get" action="${action}#tool-forms-heading">
          <input type="hidden" name="check" value="forms">
          [@siteField /]
          <button class="tool--button tool--button-quiet" type="submit">${checkForms}</button>
        </form>
      </div>

      [#if formChecks?has_content]
        <h3 class="tool--subheading" id="tool-forms-heading" tabindex="-1">${formChecks.heading}</h3>
        <p class="tool--help">${formChecks.help}</p>

        [#if formChecks.rows?has_content]
          <dl class="tool--status">
            [#list formChecks.rows as row]
              <dt>${row.label}</dt>
              <dd class="tool--tone-${row.tone}">[#if row.tone == "ok"]✓ [#elseif row.tone == "problem"]! [/#if]${row.value}</dd>
            [/#list]
          </dl>
        [/#if]

        [#if formChecks.note?has_content]
          <p class="tool--help">${formChecks.note}</p>
        [/#if]
      [/#if]
    </section>
    [/#if]
  </main>

  [#if preview?has_content]
    <aside class="tool--preview" id="tool-preview" aria-labelledby="tool-preview-heading">
      <div class="tool--preview-bar">
        <div class="tool--preview-title">
          <h2 class="tool--preview-heading" id="tool-preview-heading">${preview.heading}</h2>
          <p class="tool--preview-note">${preview.note}</p>
        </div>

        [#-- From 30 to 100 %. The figures after it also say how wide the page is drawn, which decides its layout --]
        <div class="tool--zoom">
          <label class="tool--visually-hidden" for="next-jobs-preview-zoom">${preview.zoom}</label>
          <input
            class="tool--zoom-range"
            id="next-jobs-preview-zoom"
            type="range"
            min="30"
            max="100"
            step="5"
            value="70"
            data-preview-zoom
            data-value="${preview.zoomValue}"
            data-value-text="${preview.zoomValueText}">
          <output class="tool--zoom-value" for="next-jobs-preview-zoom" data-preview-zoom-value></output>
        </div>

        <button class="tool--button tool--button-quiet tool--button-small" type="button" data-preview-reload>${preview.reload}</button>
        <a class="tool--button tool--button-quiet tool--button-small" href="${preview.newTabUrl}" target="_blank" rel="noopener">${preview.newTab}</a>
        <button
          class="tool--button tool--button-quiet tool--button-small tool--button-icon"
          type="button"
          aria-label="${preview.close}"
          title="${preview.close}"
          data-preview-close>
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false">
            <path d="M2 2l10 10M12 2L2 12"/>
          </svg>
        </button>
      </div>

      <div class="tool--preview-frame">
        [#-- Loaded when the preview is opened the first time, so the tool doesn't fetch the page unasked --]
        <iframe title="${preview.frameTitle}" data-src="${preview.frameUrl}"></iframe>
      </div>
    </aside>
  [/#if]
  </div>

  <script>
    // One card at a time, chosen in the menu. Without the script every card shows, and the menu jumps to them
    (function () {
      var nav = document.querySelector("[data-nav]");

      if (!nav) {
        return;
      }

      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
      var sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));

      // What the address names: a card, or something inside one, such as the answers about the application forms
      function named() {
        var target = null;

        try {
          target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
        } catch (e) {}

        var section = target ? target.closest("[data-section]") : null;

        return section ? { section: section, target: target } : null;
      }

      function show(section) {
        sections.forEach(function (candidate) {
          candidate.hidden = candidate !== section;
        });

        links.forEach(function (link) {
          if (link.getAttribute("href") === "#" + section.id) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      }

      // The browser looked for the place before the card was shown, so the page is moved there now
      function goTo(place) {
        show(place.section);

        if (place.target === place.section) {
          window.scrollTo(0, 0);
        } else {
          place.target.scrollIntoView();
        }
      }

      var start = named();

      if (start) {
        goTo(start);

        // The browser goes to the place the address names once more when the page is loaded, past the header
        window.addEventListener("load", function () {
          goTo(start);
        });
      } else {
        show(document.getElementById(nav.getAttribute("data-start")) || sections[0]);
      }

      window.addEventListener("hashchange", function () {
        var place = named();

        if (place) {
          goTo(place);
        }
      });
    })();
  </script>

  <script>
    // The look as it is chosen: a value that is changed becomes the site's own, a warning says when text gets hard
    // to read with a color, and the open preview shows the change before it is saved
    (function () {
      var form = document.querySelector("form[data-design-form]");

      if (!form) {
        return;
      }

      var rows = Array.prototype.slice.call(form.querySelectorAll("[data-design-row]"));
      var minContrast = Number(form.getAttribute("data-min-contrast"));
      var warning = form.getAttribute("data-warning");
      var frame = document.querySelector("#tool-preview iframe");
      var imageRow = form.querySelector("[data-design-image]");
      var WHITE = "#ffffff";
      var DARK = "#1b1b33";
      // Every property the design can set: one that is no longer the site's own is taken away in the preview
      var NAMES = [
        "--next-jobs--font-title",
        "--next-jobs--font-text",
        "--next-jobs--brand",
        "--next-jobs--accent",
        "--next-jobs--focus",
        "--next-jobs--ink",
        "--next-jobs--muted",
        "--next-jobs--button",
        "--next-jobs--button-text",
        "--next-jobs--background",
        "--next-jobs--card-radius",
        "--next-jobs--control-radius",
        "--next-jobs--margin",
        "--next-jobs--graphic-opacity",
      ];

      // The contrast between two #rrggbb colors, from 1 to 21 (WCAG 2.1), as getContrast() in /lib/next-jobs/design.ts
      function luminance(color) {
        var channels = [1, 3, 5].map(function (start) {
          var value = parseInt(color.substring(start, start + 2), 16) / 255;

          return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
      }

      function contrast(first, second) {
        var lighter = Math.max(luminance(first), luminance(second));
        var darker = Math.min(luminance(first), luminance(second));

        return (lighter + 0.05) / (darker + 0.05);
      }

      function textOn(color) {
        return contrast(WHITE, color) >= contrast(DARK, color) ? WHITE : DARK;
      }

      // A color and the corners have a check box that makes them the site's own. A list has an empty choice for the rest
      function isOwn(row) {
        var own = row.querySelector("[data-design-own]");

        return own ? own.checked : valueOf(row) !== "";
      }

      function valueOf(row) {
        return row.querySelector("[data-design-value]").value;
      }

      function rowOf(key) {
        return form.querySelector('[data-design-row="' + key + '"]');
      }

      // The value of a list. Empty for the site's own, and for a list that isn't there
      function choiceOf(key) {
        return rowOf(key) ? valueOf(rowOf(key)) : "";
      }

      // The same list as getDesignVariables() in /lib/next-jobs/design.ts builds: change the two together
      function getVariables() {
        var variables = {};

        rows.filter(isOwn).forEach(function (row) {
          var key = row.getAttribute("data-design-row");
          var value = valueOf(row);

          if (key === "brand") {
            variables["--next-jobs--brand"] = value;
          } else if (key === "accent") {
            variables["--next-jobs--accent"] = value;
            variables["--next-jobs--focus"] = value;
          } else if (key === "ink") {
            variables["--next-jobs--ink"] = value;
            variables["--next-jobs--muted"] = "color-mix(in srgb, " + value + " 78%, transparent)";
          } else if (key === "button") {
            variables["--next-jobs--button"] = value;
            variables["--next-jobs--button-text"] = textOn(value);
          } else if (key === "background") {
            variables["--next-jobs--background"] = value;
          } else if (key === "radius") {
            variables["--next-jobs--card-radius"] = value + "px";
            variables["--next-jobs--control-radius"] = Math.min(Number(value), 9) + "px";
          } else if (key === "margin") {
            variables["--next-jobs--margin"] = value + "px";
          } else if (key === "graphicOpacity") {
            variables["--next-jobs--graphic-opacity"] = String(Number(value) / 100);
          } else if (key === "fontTitle") {
            variables["--next-jobs--font-title"] = value;
          } else if (key === "fontText") {
            variables["--next-jobs--font-text"] = value;
          }
        });

        return variables;
      }

      // The page in the frame is on the same host, so its list and form can be given the values directly
      function showInPreview() {
        var page = null;

        try {
          page = frame ? frame.contentDocument : null;
        } catch (e) {}

        if (!page) {
          return;
        }

        var variables = getVariables();
        var hover = choiceOf("hover");
        var graphic = choiceOf("graphic");

        Array.prototype.forEach.call(page.querySelectorAll("[data-next-jobs-design]"), function (element) {
          // The effect on the cards and the graphic are attributes, not properties: a view has its rules for each
          if (hover) {
            element.setAttribute("data-next-jobs-hover", hover);
          } else {
            element.removeAttribute("data-next-jobs-hover");
          }

          if (graphic) {
            element.setAttribute("data-next-jobs-graphic", graphic);
          } else {
            element.removeAttribute("data-next-jobs-graphic");
          }

          if (graphic === "image") {
            showImage(page, element);
          }

          NAMES.forEach(function (name) {
            if (variables[name]) {
              element.style.setProperty(name, variables[name]);
            } else {
              element.style.removeProperty(name);
            }
          });
        });
      }

      // The image that is chosen, where the view draws the graphic. The page has the saved image already, at the
      // address XP made for it: only another image is loaded, from the address the tool has for it under this page
      function showImage(page, element) {
        var holder = element.querySelector(".next-jobs-list--graphic");
        var select = imageRow ? imageRow.querySelector("[data-design-value]") : null;
        var option = select ? select.options[select.selectedIndex] : null;
        var url = option ? option.getAttribute("data-url") : null;

        if (!holder || !select || !url) {
          return;
        }

        var image = holder.querySelector("img");
        var shown = image ? image.getAttribute("data-next-jobs-image") : null;

        if (image && shown === null && select.value === select.getAttribute("data-saved")) {
          return;
        }

        if (!image) {
          image = page.createElement("img");
          image.className = "next-jobs-list--graphic-image";
          image.alt = "";
          holder.appendChild(image);
        }

        if (shown !== select.value) {
          image.src = url;
          image.setAttribute("data-next-jobs-image", select.value);
        }
      }

      // The image is only asked for while the graphic is one: the row is hidden for the others
      function showImageRow() {
        if (!imageRow) {
          return;
        }

        var wanted = choiceOf("graphic") === "image";

        imageRow.hidden = !wanted;
        imageRow.querySelector("[data-design-value]").required = wanted;
      }

      function showWarnings() {
        rows.forEach(function (row) {
          var note = row.querySelector("[data-design-warning]");

          if (!note) {
            return;
          }

          var color = valueOf(row);
          var rule = row.querySelector("[data-design-value]").getAttribute("data-contrast");
          // The text and the links stand on the background, in the colors that are in use: the lowest contrast counts
          var ratio =
            rule === "under-text"
              ? Math.min(contrast(choiceOf("ink") || DARK, color), contrast(choiceOf("accent") || DARK, color))
              : contrast(rule === "under-best" ? textOn(color) : WHITE, color);
          // One decimal, rounded down, so a contrast just under the limit isn't shown as the limit. A comma in Norwegian
          var text = (Math.floor(ratio * 10) / 10).toFixed(1);

          if (document.documentElement.lang !== "en") {
            text = text.replace(".", ",");
          }

          note.textContent = isOwn(row) && ratio < minContrast ? warning.replace("%ratio%", text) : "";
        });
      }

      function update() {
        rows.forEach(function (row) {
          var text = row.querySelector("[data-design-range-text]");

          if (text) {
            text.textContent = text.getAttribute("data-text").replace("%value%", valueOf(row));
          }
        });

        showImageRow();
        showWarnings();
        showInPreview();
      }

      form.addEventListener("input", function (event) {
        var row = event.target.closest ? event.target.closest("[data-design-row]") : null;

        // Choosing a value is asking for it: the check box follows, and «Lagre» with it
        if (row && row.querySelector("[data-design-own]") && event.target.hasAttribute("data-design-value") && !isOwn(row)) {
          row.querySelector("[data-design-own]").checked = true;
          row.querySelector("[data-design-own]").dispatchEvent(new Event("change", { bubbles: true }));
        }

        update();
      });

      form.addEventListener("change", update);

      if (frame) {
        // A page loaded again has what is saved. What is chosen but not saved is put back, also after the site's own
        // navigation inside the frame, which changes the page without loading the frame again
        frame.addEventListener("load", function () {
          showInPreview();

          try {
            frame.contentDocument.addEventListener("turbo:load", showInPreview);
          } catch (e) {}
        });
      }

      update();
    })();
  </script>

  <script>
    // The site is shown as it is chosen. Without the script, the button beside the list does it
    (function () {
      var form = document.querySelector("form[data-site-form]");

      if (!form) {
        return;
      }

      form.querySelector('button[type="submit"]').hidden = true;
      form.querySelector("select").addEventListener("change", function () {
        form.submit();
      });
    })();
  </script>

  <script>
    // «Lagre» is on only while its form differs from what is in use. Without the script the buttons are always on
    (function () {
      var forms = document.querySelectorAll("form[data-save-form]");

      Array.prototype.forEach.call(forms, function (form) {
        var button = form.querySelector('button[type="submit"]');
        var controls = form.querySelectorAll("[data-saved]");

        if (!button) {
          return;
        }

        // The order of the rows counts too, where the form has rows that can be moved
        function isMoved() {
          var saved = form.getAttribute("data-saved-order");

          if (saved === null) {
            return false;
          }

          return (
            Array.prototype.map
              .call(form.querySelectorAll('input[name="listed"]'), function (input) {
                return input.value;
              })
              .join(",") !== saved
          );
        }

        function isChanged() {
          return (
            isMoved() ||
            Array.prototype.some.call(controls, function (control) {
              var now = control.type === "checkbox" ? String(control.checked) : control.value.trim();

              return now !== control.getAttribute("data-saved");
            })
          );
        }

        function update() {
          button.disabled = !isChanged();
        }

        form.addEventListener("input", update);
        form.addEventListener("change", update);
        // The browser can put back what was typed when the page is shown again
        window.addEventListener("pageshow", update);
        update();
      });
    })();
  </script>

  <script>
    // Moves the positions: by dragging the handle, or with the two buttons on each row
    (function () {
      var list = document.querySelector("[data-sortable]");

      if (!list) {
        return;
      }

      var form = list.closest("form");
      var live = form.querySelector("[data-order-live]");
      var reset = form.querySelector("[data-order-reset]");
      var max = parseInt(list.getAttribute("data-max"), 10) || 0;
      var dragged = null;

      function rows() {
        return Array.prototype.slice.call(list.children);
      }

      // The buttons at the ends are off, and the rows past the limit of the list are marked
      function refresh() {
        var all = rows();
        var visible = 0;

        all.forEach(function (row, index) {
          row.querySelector('[data-move="up"]').disabled = index === 0;
          row.querySelector('[data-move="down"]').disabled = index === all.length - 1;

          if (row.querySelector('input[type="checkbox"]').checked) {
            visible++;
            row.querySelector("[data-over-limit]").hidden = !(max && visible > max);
          } else {
            row.querySelector("[data-over-limit]").hidden = true;
          }
        });
      }

      // Tells the form that it has something to save, or no longer has
      function changed() {
        refresh();
        form.dispatchEvent(new Event("change", { bubbles: true }));
      }

      function announce(row) {
        var all = rows();

        live.textContent = list
          .getAttribute("data-moved")
          .replace("%title%", row.getAttribute("data-title"))
          .replace("%place%", String(all.indexOf(row) + 1))
          .replace("%count%", String(all.length));
      }

      list.addEventListener("click", function (event) {
        var button = event.target.closest("[data-move]");

        if (!button) {
          return;
        }

        var row = button.closest("li");
        var up = button.getAttribute("data-move") === "up";
        var before = up ? row.previousElementSibling : row.nextElementSibling && row.nextElementSibling.nextElementSibling;

        list.insertBefore(row, before);
        changed();
        announce(row);

        // Moving the row drops the focus. At the end of the list the button is off, so the other one takes it
        (button.disabled ? row.querySelector(up ? '[data-move="down"]' : '[data-move="up"]') : button).focus();
      });

      // A row can be dragged only by its handle, so the text in it can still be marked
      list.addEventListener("mousedown", function (event) {
        var handle = event.target.closest("[data-drag]");

        if (handle) {
          handle.closest("li").draggable = true;
        }
      });

      list.addEventListener("mouseup", function () {
        rows().forEach(function (row) {
          row.draggable = false;
        });
      });

      list.addEventListener("dragstart", function (event) {
        dragged = event.target.closest("li");
        dragged.classList.add("tool--dragging");
        event.dataTransfer.effectAllowed = "move";
        // Firefox starts no drag without data
        event.dataTransfer.setData("text/plain", dragged.getAttribute("data-title"));
      });

      // The row follows the pointer: above the middle of a row it lands before it, below the middle after it
      list.addEventListener("dragover", function (event) {
        if (!dragged) {
          return;
        }

        event.preventDefault();

        var over = event.target.closest("li");

        if (!over || over === dragged || over.parentNode !== list) {
          return;
        }

        var box = over.getBoundingClientRect();

        list.insertBefore(dragged, event.clientY < box.top + box.height / 2 ? over : over.nextElementSibling);
      });

      list.addEventListener("drop", function (event) {
        event.preventDefault();
      });

      list.addEventListener("dragend", function () {
        if (!dragged) {
          return;
        }

        var row = dragged;

        row.classList.remove("tool--dragging");
        row.draggable = false;
        dragged = null;
        changed();
        announce(row);
      });

      // Back to the order Next has: newest first
      reset.addEventListener("click", function () {
        rows()
          .sort(function (a, b) {
            return Number(a.getAttribute("data-default-index")) - Number(b.getAttribute("data-default-index"));
          })
          .forEach(function (row) {
            list.appendChild(row);
          });
        changed();
      });

      // A check mark changes which rows are past the limit
      list.addEventListener("change", refresh);

      list.classList.add("tool--sorting");
      Array.prototype.forEach.call(form.querySelectorAll("[data-drag], [data-moves]"), function (element) {
        element.hidden = false;
      });
      reset.hidden = false;
      refresh();
    })();
  </script>

  [#if preview?has_content]
    <script>
      (function () {
        var KEY = "next-jobs-preview-open";
        var openButton = document.querySelector("[data-preview-open]");
        var closeButton = document.querySelector("[data-preview-close]");
        var reload = document.querySelector("[data-preview-reload]");
        var frame = document.querySelector("#tool-preview iframe");
        var zoom = document.querySelector("[data-preview-zoom]");
        var zoomValue = document.querySelector("[data-preview-zoom-value]");

        if (!openButton || !closeButton || !reload || !frame || !zoom || !zoomValue) {
          return;
        }

        var ZOOM_KEY = "next-jobs-preview-zoom";
        var box = frame.parentNode;

        // The size and how wide the page is drawn at it: the same panel shows a wider page the smaller it is
        function showZoom() {
          var percent = Number(zoom.value);
          var width = String(Math.round(box.clientWidth / (percent / 100)));

          function fill(template) {
            return template.replace("%percent%", String(percent)).replace("%width%", width);
          }

          box.style.setProperty("--tool--zoom", String(percent / 100));
          zoomValue.textContent = fill(zoom.getAttribute("data-value"));
          zoom.setAttribute("aria-valuetext", fill(zoom.getAttribute("data-value-text")));
        }

        // The size is a habit of the one who looks, so it is kept from visit to visit. Only a size the slider has
        try {
          var kept = Number(window.localStorage.getItem(ZOOM_KEY));

          if (kept >= Number(zoom.min) && kept <= Number(zoom.max)) {
            zoom.value = String(kept);
          }
        } catch (e) {}

        zoom.addEventListener("input", function () {
          showZoom();

          try {
            window.localStorage.setItem(ZOOM_KEY, zoom.value);
          } catch (e) {}
        });

        // The panel changes width as it slides in and when the window does, and the page's width with it
        if (window.ResizeObserver) {
          new ResizeObserver(showZoom).observe(box);
        } else {
          window.addEventListener("resize", showZoom);
        }

        showZoom();

        // Private windows and blocked storage: the preview still works, it just isn't remembered
        function remember(open) {
          try {
            window.sessionStorage.setItem(KEY, open ? "1" : "0");
          } catch (e) {}
        }

        function wasOpen() {
          try {
            return window.sessionStorage.getItem(KEY) === "1";
          } catch (e) {
            return false;
          }
        }

        function show(open, slide) {
          if (open && !frame.getAttribute("src")) {
            frame.setAttribute("src", frame.getAttribute("data-src"));
          }

          document.body.classList.toggle("tool--no-motion", !slide);
          document.body.classList.toggle("tool--previewing", open);
          // Open, the button in the header has nothing to do: the X in the preview closes it
          openButton.hidden = open;
          openButton.setAttribute("aria-expanded", String(open));
        }

        openButton.hidden = false;

        // Focus follows the button that takes over, so the keyboard isn't left on a hidden one
        openButton.addEventListener("click", function () {
          show(true, true);
          remember(true);
          closeButton.focus();
        });

        closeButton.addEventListener("click", function () {
          show(false, true);
          remember(false);
          openButton.focus();
        });

        reload.addEventListener("click", function () {
          // The page from the server again, wherever the visitor has clicked inside the frame
          frame.setAttribute("src", frame.getAttribute("data-src"));
        });

        // Saving reloads the tool. An open preview stays open, and shows the page with the new settings
        if (wasOpen()) {
          show(true, false);
        }
      })();
    </script>
  [/#if]
</body>
</html>
