[#-- @ftlvariable name="id" type="String" --]
[#-- @ftlvariable name="title" type="String" --]
[#-- @ftlvariable name="headingLevel" type="Number" --]
[#-- @ftlvariable name="rootClass" type="String" --]
[#-- @ftlvariable name="buttonClass" type="String" --]
[#-- @ftlvariable name="countLine" type="String" --]
[#-- @ftlvariable name="text" type="String" --]
[#-- @ftlvariable name="listLabel" type="String" --]
[#-- @ftlvariable name="readMore" type="String" --]
[#-- @ftlvariable name="designStyle" type="String" --]
[#-- @ftlvariable name="designHover" type="String" --]
[#-- @ftlvariable name="designGraphic" type="String" --]
[#-- @ftlvariable name="graphicImageUrl" type="String" --]
[#-- @ftlvariable name="editorNotice" type="String" --]
[#-- @ftlvariable name="positions" type="java.util.ArrayList" --]
[#-- @ftlvariable name="detail" type="Object" --]
[#-- @ftlvariable name="missing" type="Object" --]
[#-- @ftlvariable name="backUrl" type="String" --]
[#-- @ftlvariable name="backLabel" type="String" --]

[#--
  The list of positions, or one posting, as a macro: a site with something of its own to draw behind the heading
  imports this file and puts it between the tags. job-list.ftlh is the view without anything of the site's own.

  .ftlh escapes everything. The texts come from Next as plain text, so never use ?no_esc here
--]
[#macro jobList]
[#local headingTag = "h${headingLevel?c}"]
[#local subHeadingTag = "h${(headingLevel + 1)?c}"]

<section
  class="next-jobs-list[#if rootClass?has_content] ${rootClass}[/#if]"
  id="${id}"
  aria-labelledby="${id}-heading"
  [#-- The colors and corners the site has set in the admin tool. Its preview sets them on the element with the mark --]
  data-next-jobs-design
  [#if designHover?has_content]data-next-jobs-hover="${designHover}"[/#if]
  [#if designGraphic?has_content]data-next-jobs-graphic="${designGraphic}"[/#if]
  [#if designStyle?has_content]style="${designStyle}"[/#if]>

  <div class="next-jobs-list--hero">
    [#--
      The site's own decoration, behind the heading. Always here, and hidden by the stylesheet when a graphic is set
      in the admin tool, so the tool's preview can go back to it
    --]
    <div class="next-jobs-list--own-graphic">[#nested]</div>

    [#-- The graphic set in the admin tool: a pattern the stylesheet draws, or an image. Decorative --]
    <div class="next-jobs-list--graphic" aria-hidden="true">
      [#if graphicImageUrl?has_content]
        <img class="next-jobs-list--graphic-image" src="${graphicImageUrl}" alt="" decoding="async">
      [/#if]
    </div>

    <div class="next-jobs-list--inner next-jobs-list--hero-text">
      <${headingTag} class="next-jobs-list--heading" id="${id}-heading">${title}</${headingTag}>

      [#if detail?has_content]
        <div class="next-jobs-list--intro">
          [#if detail.details?has_content]
            <p>${detail.details}</p>
          [/#if]
          <p>${detail.deadline}</p>
        </div>
      [#elseif missing?has_content]
        <div class="next-jobs-list--intro">
          <p>${missing.text}</p>
        </div>
      [#elseif countLine?has_content || text?has_content]
        <div class="next-jobs-list--intro">
          [#if countLine?has_content]
            <p>${countLine}</p>
          [/#if]

          [#if text?has_content]
            [#-- The editor's plain text, escaped. Line breaks are kept by CSS --]
            <p class="next-jobs-list--text">${text}</p>
          [/#if]
        </div>
      [/#if]
    </div>
  </div>

  [#if editorNotice?has_content]
    <p class="next-jobs-list--inner next-jobs-list--notice">${editorNotice}</p>
  [/#if]

  [#if detail?has_content]
    <div class="next-jobs-list--inner next-jobs-list--detail">
      <a class="next-jobs-list--back" href="${backUrl}">${backLabel}</a>

      [#if detail.bannerUrl?has_content]
        <img class="next-jobs-list--banner" src="${detail.bannerUrl}" alt="" decoding="async">
      [/#if]

      [#if detail.summary?has_content]
        <p class="next-jobs-list--summary">${detail.summary}</p>
      [/#if]

      [#if detail.sections?has_content || detail.contact?has_content]
        [#-- Two columns when there is room, so the lists don't make the posting so long --]
        <div class="next-jobs-list--sections">
          [#list detail.sections as section]
            <div class="next-jobs-list--section">
              <${subHeadingTag} class="next-jobs-list--section-heading">${section.heading}</${subHeadingTag}>
              <ul class="next-jobs-list--section-list">
                [#list section.items as item]
                  <li>${item}</li>
                [/#list]
              </ul>
            </div>
          [/#list]

          [#if detail.contact?has_content]
            [#local contact = detail.contact]
            <div class="next-jobs-list--section next-jobs-list--contact">
              <${subHeadingTag} class="next-jobs-list--section-heading">${contact.heading}</${subHeadingTag}>
              <p>
                <strong>${contact.name}</strong>
                [#if contact.title?has_content]<br>${contact.title}[/#if]
                [#if contact.email?has_content]<br><a class="next-jobs-list--contact-link" href="mailto:${contact.email}">${contact.email}</a>[/#if]
                [#if contact.phone?has_content]
                  <br>
                  [#if contact.phoneHref?has_content]<a class="next-jobs-list--contact-link" href="tel:${contact.phoneHref}">${contact.phone}</a>[#else]${contact.phone}[/#if]
                [/#if]
              </p>
            </div>
          [/#if]
        </div>
      [/#if]

      [#if detail.article?has_content]
        <a class="next-jobs-list--more next-jobs-list--article" href="${detail.article.url}">${detail.article.label}</a>
      [/#if]

      [#if detail.applyUrl?has_content]
        <a class="${buttonClass} next-jobs-list--apply-button" href="${detail.applyUrl}">${detail.apply}</a>
      [/#if]
    </div>
  [#elseif missing?has_content]
    <div class="next-jobs-list--inner next-jobs-list--detail">
      <a class="next-jobs-list--back" href="${backUrl}">${backLabel}</a>
    </div>
  [#elseif positions?has_content]
    <ul class="next-jobs-list--inner next-jobs-list--grid" role="list" aria-label="${listLabel}">
      [#list positions as position]
        [#local titleId = "${id}-position-${position.number}"]
        <li class="next-jobs-list--card next-jobs-list--variant-${position.variant}">
          <div class="next-jobs-list--stripe${position.imageUrl?has_content?then(" next-jobs-list--stripe-image", "")}">
            [#if position.imageUrl?has_content]
              [#-- Decorative: the title below says what the card is --]
              <img class="next-jobs-list--image" src="${position.imageUrl}" alt="" loading="lazy" decoding="async">
            [/#if]

            <span class="next-jobs-list--number" aria-hidden="true">${position.number}</span>

            [#if position.unit?has_content]
              <span class="next-jobs-list--unit">${position.unit}</span>
            [/#if]
          </div>

          <div class="next-jobs-list--body">
            <h3 class="next-jobs-list--title" id="${titleId}">${position.title}</h3>

            [#if position.details?has_content]
              <p class="next-jobs-list--details">${position.details}</p>
            [/#if]

            <div class="next-jobs-list--footer">
              [#if position.deadline?has_content]
                <span class="next-jobs-list--deadline">${position.deadline}</span>
              [/#if]

              [#-- The same link text on every card: aria-describedby tells which position it is --]
              <a class="next-jobs-list--more" href="${position.detailUrl}" aria-describedby="${titleId}">${readMore}</a>
            </div>
          </div>
        </li>
      [/#list]
    </ul>
  [/#if]
</section>
[/#macro]
