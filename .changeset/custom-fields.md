---
"@item-enonic-types/lib-next-jobs": minor
---

The form draws the fields a tenant has added in Next: its own candidate fields, last in their section, and a position's own questions under the heading Next gives them. All eight types are drawn (text, number, long text, radio buttons, a list to choose from, a checkbox, several choices and tags), with Next's label, help text and options. The submission then carries `customFields=1` and the answers under the names Next gave (`cf.<id>`), and a required answer that is missing is shown at its field. Needs a Next with `customFields` in the form; an older Next gives the form as before. `SiteApplyForm` has `sections` and `customFields`, and `JobApplyField` has `id` and the new kinds.
