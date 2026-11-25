[#-- @ftlvariable name="rootClass" type="String" --]
[#-- @ftlvariable name="buttonClass" type="String" --]
[#-- @ftlvariable name="surface" type="String" --]
[#-- @ftlvariable name="designStyle" type="String" --]
[#-- @ftlvariable name="editorNotice" type="String" --]
[#-- @ftlvariable name="application" type="Object" --]

[#-- The pieces of a paragraph or a list item. On one line: the text keeps its own line breaks, and must get no others --]
[#macro richRuns runs][#list runs as run][#if run.bold]<strong>[/#if][#if run.italic]<em>[/#if]${run.text}[#if run.italic]</em>[/#if][#if run.bold]</strong>[/#if][/#list][/#macro]

[#-- .ftlh escapes everything. The texts come from Next and from the editor as plain text, so never use ?no_esc here --]

[#-- The style has the colors and corners the site has set in the admin tool. Its preview sets them on the element with the mark --]
<div
  class="next-jobs-apply next-jobs-apply--surface-${surface}[#if rootClass?has_content] ${rootClass}[/#if]"
  data-next-jobs-design[#if designStyle?has_content]
  style="${designStyle}"[/#if]>
  [#if editorNotice?has_content]
    <p class="next-jobs-apply--inner next-jobs-apply--notice">${editorNotice}</p>
  [/#if]

  [#if application?has_content]
    <div class="next-jobs-apply--inner">
      [#-- The cards link here: tabindex lets the browser move focus to the section --]
      <section class="next-jobs-apply--application" id="${application.id}" aria-labelledby="${application.id}-heading" tabindex="-1">
        [#if application.description?has_content]
          [#-- Closed until the candidate opens it, so the form stays near the top. Plain HTML: works with the keyboard and without the script --]
          <details class="next-jobs-form--more">
            <summary class="next-jobs-form--more-summary">${application.description.label}</summary>
            <div class="next-jobs-form--rich">
              [#list application.description.blocks as block]
                [#if block.type == "p"]
                  <p>[@richRuns runs=block.items[0] /]</p>
                [#else]
                  <${block.type}>
                    [#list block.items as item]
                      <li>[@richRuns runs=item /]</li>
                    [/#list]
                  </${block.type}>
                [/#if]
              [/#list]
            </div>
          </details>
        [/#if]

        [#if application.state != "form"]
          <div class="next-jobs-form--card">
            <h2 class="next-jobs-form--heading" id="${application.id}-heading">${application.heading}</h2>
            [#if application.state == "received"]
              <p class="next-jobs-form--receipt next-jobs-form--pre-line" role="status">${application.text}</p>
            [#elseif application.state == "external"]
              [#-- Next didn't answer with the form: the candidate applies in Next instead --]
              <a class="${buttonClass} next-jobs-form--button" href="${application.applyUrl}">${application.applyLabel}</a>
            [#else]
              <p>${application.text}</p>
            [/#if]
          </div>
        [#else]
          [#assign form = application.form]
          [#assign prefix = application.id]

          [#if application.intro?has_content]
            [#-- The editor's plain text, escaped. Line breaks are kept by CSS --]
            <p class="next-jobs-apply--text">${application.intro}</p>
          [/#if]

          [#-- The script sends with fetch and keeps what the candidate wrote. Without it, the form posts and comes back here --]
          <next-jobs-form
            data-required="${form.fieldMessages.required}"
            data-email="${form.fieldMessages.email}"
            data-cv="${form.fieldMessages.cv}"
            data-max-bytes="${form.cv.maxBytes?c}"
            data-accept="${form.cv.accept}"
            data-sending="${form.sending}">
            <form class="next-jobs-form" method="post" action="${form.action}" enctype="multipart/form-data" data-turbo="false">
              <input type="hidden" name="positionId" value="${form.positionId}">
              <input type="hidden" name="anchor" value="${form.anchor}">
              <input type="hidden" name="startedAt" value="${form.startedAt}">
              [#if form.hasCustomFields]
                [#-- The form draws the tenant's own fields: with the mark, Next reads them and holds the required ones --]
                <input type="hidden" name="customFields" value="1">
              [/#if]

              [#assign cvError = (form.errorField!"") == "cv"]
              [#if form.cvRead?has_content]
                [#assign cvRead = form.cvRead]
                [#-- The CV first: reading it fills in the fields below. The same file goes with the application --]
                <div
                  class="next-jobs-form--card next-jobs-form--cv-card"
                  data-cv-read="${cvRead.action}"
                  data-cv-accept="${cvRead.accept}"
                  data-cv-max-bytes="${cvRead.maxBytes?c}">
                  <h2 class="next-jobs-form--heading">${cvRead.heading}</h2>
                  <p class="next-jobs-form--intro" data-script-only hidden>${cvRead.intro}</p>

                  [#if cvRead.readers?size > 1]
                    <fieldset class="next-jobs-form--readers" data-script-only hidden>
                      <legend class="next-jobs-form--label">${cvRead.question}</legend>
                      <div class="next-jobs-form--switch">
                        [#list cvRead.readers as reader]
                          <input
                            class="next-jobs-form--switch-input"
                            id="${prefix}-reader-${reader.value}"
                            type="radio"
                            name="leser"
                            value="${reader.value}"
                            aria-describedby="${prefix}-reader-${reader.value}-text"
                            [#if reader.value == "local"]checked[/#if]>
                          <label class="next-jobs-form--switch-label" for="${prefix}-reader-${reader.value}">${reader.label}</label>
                        [/#list]
                      </div>
                    </fieldset>
                  [/#if]

                  [#list cvRead.readers as reader]
                    <div
                      class="next-jobs-form--reader-text"
                      id="${prefix}-reader-${reader.value}-text"
                      data-reader="${reader.value}"
                      data-script-only
                      hidden>
                      <p class="next-jobs-form--reader-heading">${reader.heading}</p>
                      <p>${reader.text}</p>
                    </div>
                  [/#list]

                  <div class="next-jobs-form--drop" data-field="cv">
                    <span class="next-jobs-form--drop-icon" aria-hidden="true">↑</span>
                    [#-- The mark from Next, marching while the CV is read. The status below says it in words --]
                    <svg class="next-jobs-form--spinner" viewBox="0 0 460 430" aria-hidden="true" focusable="false">
                      <clipPath id="${prefix}-spinner-plate"><rect width="460" height="430" rx="83"/></clipPath>
                      <rect class="next-jobs-form--spinner-plate" width="460" height="430" rx="83"/>
                      <g clip-path="url(#${prefix}-spinner-plate)">
                        <path class="next-jobs-form--spinner-out" d="M0 90 H72 L160 213 L72 336 H0 L88 213 Z"/>
                        <path class="next-jobs-form--spinner-step" d="M0 90 H72 L160 213 L72 336 H0 L88 213 Z"/>
                        <path class="next-jobs-form--spinner-in" d="M0 90 H72 L160 213 L72 336 H0 L88 213 Z"/>
                        <path class="next-jobs-form--spinner-in-late" d="M0 90 H72 L160 213 L72 336 H0 L88 213 Z"/>
                      </g>
                    </svg>
                    <div class="next-jobs-form--drop-text">
                      [#-- With a file chosen, its name is shown in place of the invitation, which stays for screen readers --]
                      <label class="next-jobs-form--label" for="${prefix}-cv">
                        <span data-drop-choose>${cvRead.dropLabel}</span>
                        <span class="next-jobs-form--drop-file" data-drop-file hidden></span>
                      </label>
                      <p class="next-jobs-form--help" id="${prefix}-cv-help">${cvRead.dropHelp}</p>
                    </div>
                    [#-- In place of the text while reading: what happens, and which file --]
                    <div class="next-jobs-form--drop-wait" aria-hidden="true">
                      <p class="next-jobs-form--drop-wait-title" data-wait-title></p>
                      <p class="next-jobs-form--help" data-wait-file></p>
                    </div>
                    <span class="next-jobs-form--drop-button" aria-hidden="true" data-drop-button data-again="${cvRead.chooseAgainLabel}">${cvRead.chooseLabel}</span>
                    <input
                      class="next-jobs-form--file next-jobs-form--drop-input"
                      id="${prefix}-cv"
                      name="cv"
                      type="file"
                      accept="${form.cv.accept}"
                      aria-describedby="${prefix}-cv-help ${prefix}-cv-error ${prefix}-cv-status"
                      [#if cvError]aria-invalid="true"[/#if]>
                  </div>
                  <p class="next-jobs-form--error" id="${prefix}-cv-error"[#if !cvError] hidden[/#if]>[#if cvError]${form.errorText!}[/#if]</p>
                  <p class="next-jobs-form--cv-status" id="${prefix}-cv-status" role="status"></p>
                  <p class="next-jobs-form--help">${cvRead.text}</p>

                  <div hidden>
                    [#list cvRead.messages as message]
                      <span data-message="${message.key}">${message.text}</span>
                    [/#list]
                  </div>
                </div>
              [/#if]

              <div class="next-jobs-form--card">
                <h2 class="next-jobs-form--heading" id="${application.id}-heading">${application.heading}</h2>
                <p class="next-jobs-form--note">${form.requiredNote}</p>

                <div class="next-jobs-form--grid">
                  [#list form.fields as field]
                    [#assign fieldId = "${prefix}-${field.id}"]
                    [#assign hasError = (form.errorField!"") == field.key]
                    [#assign describedBy = field.help?has_content?then("${fieldId}-help ", "") + "${fieldId}-error"]
                    [#assign fieldClass = field.wide?then(" next-jobs-form--wide", "")]

                    [#if field.kind == "rows"]
                      [#assign row = field.row]
                      <fieldset
                        class="next-jobs-form--rows${fieldClass}"
                        data-field="${field.key}"
                        data-rows-required="${field.required?c}"
                        aria-describedby="${fieldId}-error">
                        <legend class="next-jobs-form--label">${field.label}[#if field.required]<span aria-hidden="true"> *</span>[/#if]</legend>
                        <div class="next-jobs-form--row-list" data-row-list>
                          [#-- Without the script: one row with plain text for the period --]
                          <noscript>
                            <div class="next-jobs-form--row">
                              <div class="next-jobs-form--row-top">
                                <input class="next-jobs-form--input" name="${row.first.name}" type="text" aria-label="${row.first.label}" placeholder="${row.first.label}"[#if field.required] required[/#if]>
                                <input class="next-jobs-form--input" name="${row.second.name}" type="text" aria-label="${row.second.label}" placeholder="${row.second.label}">
                              </div>
                              <div class="next-jobs-form--period">
                                <input class="next-jobs-form--input" name="${row.from.name}" type="text" aria-label="${row.from.label}" placeholder="${row.from.label}">
                                <input class="next-jobs-form--input" name="${row.to.name}" type="text" aria-label="${row.to.label}" placeholder="${row.to.label}">
                              </div>
                            </div>
                          </noscript>
                        </div>
                        [#-- The script copies this for each row. __i__ becomes the number of the row --]
                        <template data-row-template>
                          <div class="next-jobs-form--row" data-row>
                            <div class="next-jobs-form--row-top">
                              <input class="next-jobs-form--input" id="${fieldId}-__i__-first" name="${row.first.name}" type="text" aria-label="${row.first.label}" placeholder="${row.first.label}">
                              <input class="next-jobs-form--input" id="${fieldId}-__i__-second" name="${row.second.name}" type="text" aria-label="${row.second.label}" placeholder="${row.second.label}">
                              <button class="next-jobs-form--remove" type="button" data-remove-row aria-label="${row.remove}">×</button>
                            </div>
                            <div class="next-jobs-form--period">
                              [#list [row.from, row.to] as periodEnd]
                                <div class="next-jobs-form--period-end" data-period="${periodEnd.name}">
                                  <span class="next-jobs-form--period-label" aria-hidden="true">${periodEnd.label}</span>
                                  <select class="next-jobs-form--select" data-period-month aria-label="${form.periods.monthLabel?replace("{0}", periodEnd.label)}">
                                    <option value="">–</option>
                                    [#list form.periods.months as month]
                                      <option value="${(month?index + 1)?string("00")}">${month}</option>
                                    [/#list]
                                  </select>
                                  <select class="next-jobs-form--select" data-period-year aria-label="${form.periods.yearLabel?replace("{0}", periodEnd.label)}">
                                    <option value="">–</option>
                                    [#list form.periods.years as year]
                                      <option value="${year}">${year}</option>
                                    [/#list]
                                  </select>
                                  <input type="hidden" name="${periodEnd.name}" value="">
                                </div>
                              [/#list]
                              <label class="next-jobs-form--ongoing">
                                <input type="checkbox" data-period-ongoing>
                                <span>${row.ongoing}</span>
                              </label>
                            </div>
                          </div>
                        </template>
                        <button class="next-jobs-form--add" type="button" data-add-row hidden>${field.addLabel}</button>
                        <p class="next-jobs-form--error" id="${fieldId}-error"[#if !hasError] hidden[/#if]>[#if hasError]${form.errorText!}[/#if]</p>
                      </fieldset>
                    [#elseif field.kind == "heading"]
                      [#-- The position's own questions, under the heading Next gives the section --]
                      <h3 class="next-jobs-form--subheading next-jobs-form--wide">${field.label}</h3>
                    [#elseif field.kind == "radio" || field.kind == "multi"]
                      [#-- One of the options, or several: the question is the legend, so it is read with each option --]
                      <fieldset class="next-jobs-form--choices${fieldClass}" data-field="${field.key}" aria-describedby="${describedBy}">
                        <legend class="next-jobs-form--label">${field.label}[#if field.required]<span aria-hidden="true"> *</span>[/#if]</legend>
                        [#list field.options as option]
                          <label class="next-jobs-form--choice">
                            [#-- A required group of checkboxes can't be said in HTML: Next turns the application down, and names the field --]
                            <input
                              type="[#if field.kind == "radio"]radio[#else]checkbox[/#if]"
                              name="${field.key}"
                              value="${option.value}"
                              [#if field.kind == "radio" && field.required]required[/#if]
                              [#if hasError && option?is_first]aria-invalid="true"[/#if]>
                            <span>${option.label}</span>
                          </label>
                        [/#list]
                        [#if field.help?has_content]
                          <p class="next-jobs-form--help" id="${fieldId}-help">${field.help}</p>
                        [/#if]
                        <p class="next-jobs-form--error" id="${fieldId}-error"[#if !hasError] hidden[/#if]>[#if hasError]${form.errorText!}[/#if]</p>
                      </fieldset>
                    [#elseif field.kind == "checkbox"]
                      <div class="next-jobs-form--field${fieldClass}" data-field="${field.key}">
                        <div class="next-jobs-form--check">
                          <input
                            id="${fieldId}"
                            name="${field.key}"
                            type="checkbox"
                            value="on"
                            aria-describedby="${describedBy}"
                            [#if field.required]required[/#if]
                            [#if hasError]aria-invalid="true"[/#if]>
                          <label for="${fieldId}">${field.label}[#if field.required]<span aria-hidden="true"> *</span>[/#if]</label>
                        </div>
                        [#if field.help?has_content]
                          <p class="next-jobs-form--help" id="${fieldId}-help">${field.help}</p>
                        [/#if]
                        <p class="next-jobs-form--error" id="${fieldId}-error"[#if !hasError] hidden[/#if]>[#if hasError]${form.errorText!}[/#if]</p>
                      </div>
                    [#else]
                      <div class="next-jobs-form--field${fieldClass}" data-field="${field.key}">
                        <label class="next-jobs-form--label" for="${fieldId}">${field.label}[#if field.required]<span aria-hidden="true"> *</span>[/#if]</label>
                        [#if field.kind == "textarea"]
                          <textarea
                            class="next-jobs-form--input"
                            id="${fieldId}"
                            name="${field.key}"
                            rows="5"
                            aria-describedby="${describedBy}"
                            [#if field.maxlength?has_content]maxlength="${field.maxlength?c}"[/#if]
                            [#if field.required]required[/#if]
                            [#if hasError]aria-invalid="true"[/#if]></textarea>
                        [#elseif field.kind == "select"]
                          <select
                            class="next-jobs-form--input"
                            id="${fieldId}"
                            name="${field.key}"
                            aria-describedby="${describedBy}"
                            [#if field.required]required[/#if]
                            [#if hasError]aria-invalid="true"[/#if]>
                            <option value="">${form.chooseLabel}</option>
                            [#list field.options as option]
                              <option value="${option.value}">${option.label}</option>
                            [/#list]
                          </select>
                        [#elseif field.kind == "tags"]
                          [#-- A comma list without the script. With it, each value is a tag with a hidden field --]
                          <div class="next-jobs-form--tags" data-tags="${field.key}" data-remove-label="${field.removeTag!}">
                            <ul class="next-jobs-form--tag-list" role="list"></ul>
                            <input
                              class="next-jobs-form--tag-input"
                              id="${fieldId}"
                              name="${field.key}"
                              type="text"
                              aria-describedby="${describedBy}"
                              [#if field.required]required[/#if]
                              [#if hasError]aria-invalid="true"[/#if]>
                          </div>
                        [#else]
                          <input
                            class="next-jobs-form--input"
                            id="${fieldId}"
                            name="${field.key}"
                            type="${field.kind}"
                            aria-describedby="${describedBy}"
                            [#if field.autocomplete?has_content]autocomplete="${field.autocomplete}"[/#if]
                            [#if field.inputmode?has_content]inputmode="${field.inputmode}"[/#if]
                            [#if field.placeholder?has_content]placeholder="${field.placeholder}"[/#if]
                            [#if field.maxlength?has_content]maxlength="${field.maxlength?c}"[/#if]
                            [#if field.min?has_content]min="${field.min}"[/#if]
                            [#if field.max?has_content]max="${field.max}"[/#if]
                            [#if field.step?has_content]step="${field.step}"[/#if]
                            [#if field.required]required[/#if]
                            [#if hasError]aria-invalid="true"[/#if]>
                        [/#if]
                        [#if field.help?has_content]
                          <p
                            class="next-jobs-form--help"
                            id="${fieldId}-help"
                            [#if field.tagsHelp?has_content]data-script-help="${field.tagsHelp}"[/#if]>${field.help}</p>
                        [/#if]
                        <p class="next-jobs-form--error" id="${fieldId}-error"[#if !hasError] hidden[/#if]>[#if hasError]${form.errorText!}[/#if]</p>
                      </div>
                    [/#if]
                  [/#list]

                  [#if !form.cvRead?has_content]
                    <div class="next-jobs-form--field next-jobs-form--wide" data-field="cv">
                      <label class="next-jobs-form--label" for="${prefix}-cv">${form.cv.label}</label>
                      <p class="next-jobs-form--help" id="${prefix}-cv-help">${form.cv.help}</p>
                      <input
                        class="next-jobs-form--file"
                        id="${prefix}-cv"
                        name="cv"
                        type="file"
                        accept="${form.cv.accept}"
                        aria-describedby="${prefix}-cv-help ${prefix}-cv-error"
                        [#if cvError]aria-invalid="true"[/#if]>
                      <p class="next-jobs-form--error" id="${prefix}-cv-error"[#if !cvError] hidden[/#if]>[#if cvError]${form.errorText!}[/#if]</p>
                    </div>
                  [/#if]
                </div>

                [#if form.talentPool?has_content]
                  <div class="next-jobs-form--check">
                    <input id="${prefix}-talentPool" name="talentPool" type="checkbox" value="on">
                    <label for="${prefix}-talentPool">${form.talentPool}</label>
                  </div>
                [/#if]

                [#-- The bot check: people never see or reach it. Not display:none, which bots skip --]
                <div class="next-jobs-form--trap" aria-hidden="true">
                  <label for="${prefix}-website">Website</label>
                  <input id="${prefix}-website" name="website" type="text" value="" tabindex="-1" autocomplete="off">
                </div>

                <p class="next-jobs-form--privacy">
                  ${form.privacyText}
                  <a class="next-jobs-form--link" href="${form.privacyUrl}">${form.privacyLinkLabel}</a>
                </p>

                <div class="next-jobs-form--notices" role="alert">
                  [#list form.notices as notice]
                    <p class="next-jobs-form--notice" data-outcome="${notice.outcome}"[#if (form.outcome!"") != notice.outcome] hidden[/#if]>
                      ${notice.text}
                      [#if notice.linkLabel?has_content]
                        <a class="next-jobs-form--link" href="${application.applyUrl}">${notice.linkLabel}</a>
                      [/#if]
                    </p>
                  [/#list]
                </div>

                <button class="${buttonClass} next-jobs-form--button next-jobs-form--submit" type="submit">${form.submit}</button>
              </div>
            </form>
          </next-jobs-form>
        [/#if]
      </section>
    </div>
  [/#if]
</div>
