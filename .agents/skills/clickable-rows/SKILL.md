---
name: clickable-rows
description: Build MOH web rows with browser-native links and independent nested controls.
---

# Clickable rows

Internal navigation must render a real anchor: use `NuxtLink`, or `Button as="NuxtLink"`
for a navigation-only CTA. Keep mutation/confirmation actions as buttons.

A row containing other links or controls cannot be wrapped in another anchor. Inspect
`components/app/content/PostRow.vue` and `composables/post-row/usePostRowNavigation.ts`:
a background `NuxtLink` covers the row below its content; the outer row handles navigation
and keyboard activation. Keep the background link `aria-hidden` and `tabindex="-1"`, and
make the outer row focusable only when it has a destination.

Reuse `utils/interactive-target.ts` with the appropriate preset; do not copy its selector
list into a component. Nested links, buttons, editable regions and media controls retain
their own actions. Keyboard handlers must target the row itself, not bubble from its controls.
Preserve cmd/ctrl-click, middle-click and right-click navigation. Verify these behaviors on
text as well as blank row space, and verify nested controls do not navigate the row.

For a table, anchors belong inside a `td`, never directly under `tbody` or `tr`. Inspect
an existing table row before applying the overlay pattern. A row without a destination
has no link role, focus target or navigation cursor.
