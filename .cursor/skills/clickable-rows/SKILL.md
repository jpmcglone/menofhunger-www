---
name: clickable-rows
description: >-
  Build full-row clickable cards, feed rows, notification rows, and table rows
  in Nuxt 3 that support right-click "Open in new tab", cmd/ctrl+click, and
  middle-click. Use when adding a list item, feed row, notification row, card,
  or table row that navigates somewhere when clicked.
---

# Clickable Rows / Cards — Background NuxtLink Overlay Pattern

## The Problem

A full-width clickable row often contains inner interactive elements (avatar links, action buttons, menus). Naïve approaches break browser-native link behavior:

| Approach | Problem |
|---|---|
| `<div @click="navigateTo(...)">` | No `<a>` in DOM → right-click / middle-click can't "Open in new tab" |
| `<NuxtLink custom v-slot="{navigate}"><div role="link" @click="navigate">` | Renders a `<div>`, not an `<a>` → same problem |
| Wrapping the whole row in `<NuxtLink>` | Inner `<a>` tags (avatars, timestamps) become nested anchors → browser restructures DOM → hydration mismatch |

## The Solution: Background NuxtLink Overlay

Render the row as a **positioned `<div>`** with:
1. An `aria-hidden`, `tabindex="-1"` `<NuxtLink>` absolutely covering the full row at `z-[1]` — gives the browser a real `<a>` for right-click context menu and link detection
2. Content at `z-[2]` so it receives pointer events normally
3. `@click` / `@auxclick` handlers on the outer `<div>` for SPA navigation, cmd/ctrl+click, and middle-click
4. Inner interactive elements at `z-10+` with `@click.stop` so they intercept clicks before navigation

```vue
<div
  class="relative cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900"
  role="link"
  tabindex="0"
  @click="onRowClick(href, $event)"
  @auxclick="onRowAuxClick(href, $event)"
  @keydown.enter.prevent="navigateTo(href)"
  @keydown.space.prevent="navigateTo(href)"
>
  <!-- Real <a> for right-click "Open in new tab" and browser link detection.
       aria-hidden + tabindex=-1 keeps it invisible to keyboard / screen readers. -->
  <NuxtLink
    :to="href"
    class="absolute inset-0 z-[1]"
    tabindex="-1"
    aria-hidden="true"
  />

  <!-- Content sits above the background link -->
  <div class="relative z-[2] flex gap-3 px-4 py-3">

    <!-- Inner link: @click.stop so it wins over the background NuxtLink -->
    <NuxtLink :to="authorHref" class="shrink-0" @click.stop>
      <AppUserAvatar ... />
    </NuxtLink>

    <!-- Action button: @click.stop.prevent so it neither navigates nor bubbles -->
    <button class="..." @click.stop.prevent="onFollowBack">Follow back</button>

    <div><!-- non-interactive content — clicks bubble to outer div → navigates --></div>
  </div>
</div>
```

### Required click helpers (copy-paste into the component/page)

```ts
function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      ['a', 'button', 'iframe', 'input', 'textarea', 'select',
       '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
    ),
  )
}

function onRowClick(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onRowAuxClick(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(href, '_blank')
}
```

## Z-index Conventions

| Layer | z-index | Purpose |
|---|---|---|
| Hover background | `z-0` | Animated tint on hover (optional) |
| Background NuxtLink | `z-[1]` | Real `<a>` for browser link detection |
| Row content wrapper | `z-[2]` | All text, avatars, badges — receives pointer events |
| Inner interactive elements | `z-10+` | Buttons, avatar links — MUST add `@click.stop` |

## Conditional Href

When a row may or may not have a destination (e.g. some notifications have no link):

```vue
<div
  :class="href ? 'cursor-pointer hover:bg-...' : ''"
  :role="href ? 'link' : undefined"
  :tabindex="href ? 0 : undefined"
  @click="href ? onRowClick(href, $event) : undefined"
  @auxclick="href ? onRowAuxClick(href, $event) : undefined"
>
  <NuxtLink v-if="href" :to="href" class="absolute inset-0 z-[1]" tabindex="-1" aria-hidden="true" />
  <div class="relative z-[2]">...</div>
</div>
```

## Table Rows (`<tr>`)

`<a>` cannot be a direct child of `<tbody>`. Use this approach instead:

```vue
<tr
  class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
  @click="onRowClick(href, $event)"
  @auxclick="onRowAuxClick(href, $event)"
>
  <!-- Put the background NuxtLink in the first <td>; since <tr> is position:relative,
       inset-0 on an absolutely positioned child positions relative to the <tr>. -->
  <td class="px-4 py-3">
    <NuxtLink :to="href" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
    <div class="relative z-[1]">Primary cell content</div>
  </td>
  <td class="px-4 py-3">Other cell content (no z-index needed)</td>
</tr>
```

`position: relative` on `<tr>` is supported in all modern browsers (Chrome, Firefox, Safari).

## Reference Implementations

- **Feed post rows**: `components/app/PostRow.vue` (lines 30–38, `onRowClick`, `onRowAuxClick`)
- **Notification rows**: `pages/notifications.vue` (`onNotificationClick`, `onNotificationAuxClick`)
- **Admin analytics tables**: `pages/admin/analytics.vue`

## Inner Element Rules

- Inner `<NuxtLink>` (e.g. avatar → profile): add `@click.stop`
- Inner `<button>` for actions: add `@click.stop.prevent` (prevents navigation AND default)
- Inner elements that wrap action buttons: add `@click.stop.prevent` on the wrapper div
- Non-interactive text/images: no annotation needed — clicks bubble up to the outer div → navigates
